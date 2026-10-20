import 'reflect-metadata';
import { stat } from 'node:fs/promises';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service.js';
import { OrientationAdminService } from '../ielts-orientation/application/orientation-admin.service.js';
import { IeltsBridgeAdminService } from '../ielts-bridge/application/ielts-bridge-admin.service.js';
import { IeltsBandAdminService } from '../ielts-band-curriculum/application/ielts-band-admin.service.js';
import { IeltsMockAdminService } from '../ielts-mock/application/ielts-mock-admin.service.js';
import { readIeltsProgramReadiness } from '../learning-programs/application/ielts-program-readiness.js';
import { LocalObjectStorageAdapter } from '../storage/infrastructure/local-object-storage.adapter.js';
import { hash, listening, reading, stableUuid } from './content.js';
import { bytesHash, readPreparedAudio } from './prepare-audio.js';
import { savePrivateSnapshot } from './private-snapshot.js';
import { audioId, audioIdentity, makePlan, readReleaseState, releaseName, storageRoot, type ReleaseState } from './release-state.js';
import { assertLocalDatabase, parseOptions, runRelease, verifyWave } from './safety.js';
import { publishAtomically } from './transaction.js';

/** The existing publishers use callback transactions. Bind all of them to ONE outer transaction. */
export function publisherDatabase(tx: Prisma.TransactionClient): PrismaService {
  return new Proxy(tx, {
    get(target, property) {
      if (property === '$transaction') return async <T>(work: (database: Prisma.TransactionClient) => Promise<T>) => work(tx);
      return Reflect.get(target, property);
    },
  }) as PrismaService;
}

export async function lockSources(tx: Prisma.TransactionClient, state: ReleaseState) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('worklingo:ielts-local-beta-release'))`;
  // Match existing publishers: acquire their advisory locks before parent rows.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'worklingo:ielts-orientation'}))`;
  for (const bridge of [...state.bridges].sort((left, right) => left.id.localeCompare(right.id))) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'worklingo:ielts-bridge:' + bridge.id}))`;
  }
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-band-curriculum'}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-mock:' + state.mock.id}))`;
  // Row locks also protect against publishers which use a different advisory-lock namespace.
  await tx.$queryRaw`SELECT id FROM "LearningProgram" WHERE id = ${state.program.id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "IeltsOrientation" WHERE id = ${state.orientation.id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "IeltsBridgeModule" WHERE id IN (${Prisma.join(state.bridges.map((row) => Prisma.sql`${row.id}::uuid`))}) ORDER BY id FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "IeltsIntegratedProfile" WHERE id IN (${Prisma.join(state.profiles.map((row) => Prisma.sql`${row.id}::uuid`))}) ORDER BY id FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "IeltsBandCurriculum" WHERE id = ${state.band.id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "IeltsMockTest" WHERE id = ${state.mock.id}::uuid FOR UPDATE`;
}

/** No AppModule/bootstrap: there are no workers, paid adapters, HTTP listeners or learner services here. */
export async function releaseLocalBeta(args: string[]): Promise<void> {
  const options = parseOptions(args);
  if (options.execute && !options.expect) throw new Error('Execute requires --expect=<fingerprint from reviewed dry run>.');
  assertLocalDatabase(process.env.DATABASE_URL ?? '');
  const prepared = await readPreparedAudio();
  if (!(await stat(storageRoot)).isDirectory()) throw new Error('Existing local storage directory is unavailable.');
  const database = new PrismaService({ log: [], errorFormat: 'minimal' });
  const storage = new LocalObjectStorageAdapter(storageRoot);
  let phase = 'read-only inspection';
  try {
    const actor = await database.user.findFirst({ where: {
      ...(process.env.IELTS_BETA_ACTOR_ID ? { id: process.env.IELTS_BETA_ACTOR_ID } : {}),
      role: { in: ['CONTENT_ADMIN', 'SYSTEM_ADMIN'] }, status: 'ACTIVE',
    }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true } });
    if (!actor) throw new Error('No active local admin.');
    const ids = prepared.manifest.map(audioId);
    const inspected = await database.$transaction(async (tx) => {
      const target = await tx.$queryRaw<{ name: string; schema: string }[]>`SELECT current_database() AS name, current_schema() AS schema`;
      if (target[0]?.name !== 'worklingo' || target[0].schema !== 'public') throw new Error('Unexpected database/schema.');
      const state = await readReleaseState(tx, ids);
      return { state, plan: makePlan(state, prepared.manifest), readiness: await readIeltsProgramReadiness(tx) };
    }, { isolationLevel: 'RepeatableRead' });
    const { state, plan } = inspected;
    if (options.expect && options.expect !== plan.fingerprint) throw new Error('Reviewed dry-run fingerprint changed.');
    // Existing artifacts are rechecked against actual bytes before an idempotent skip.
    for (const artifact of state.audio) {
      const index = ids.indexOf(artifact.id); const entry = prepared.manifest[index]!;
      const bytes = await storage.read(artifact.storageKey); verifyWave(bytes);
      if (artifact.status !== 'READY' || artifact.adapterName !== 'local-windows-speech' || artifact.checksum !== entry.checksum
        || artifact.byteSize !== entry.byteSize || artifact.mimeType !== 'audio/wav' || artifact.scriptHash !== entry.inputHash
        || bytesHash(bytes) !== entry.checksum || artifact.generationKey !== audioIdentity(entry)) throw new Error('Existing media does not match reviewed original audio.');
    }
    console.log(JSON.stringify({ release: releaseName, mode: options.execute ? 'EXECUTE' : 'DRY_RUN', fingerprint: plan.fingerprint,
      admin: 'existing active local admin selected privately', currentReadiness: inspected.readiness,
      proposed: { orientation: plan.work.orientation ? 'new reviewed version' : 'reuse',
        bridge: plan.bridges.map((row) => ({ skill: row.content.skill, action: row.publish ? 'new distinct exercises' : 'reuse' })),
        integratedPractice: 'reuse published 60/90/120/150 profiles', band: plan.work.band ? 'new reviewed seven-stage version' : 'reuse',
        academicMock: plan.work.mock ? 'replace synthetic fixture with original practice' : 'reuse',
        readingWords: reading.reduce((sum, item) => sum + item.text.split(/\s+/u).length, 0),
        questions: { listening: 40, reading: 40 }, audio: prepared.manifest.map((entry) => ({ part: entry.part, seconds: entry.durationSeconds, bytes: entry.byteSize, provider: entry.adapterName, voices: entry.voices })),
        finalAvailability: 'BETA only after readiness and actual stored WAV checks' } }, null, 2));
    const complete = plan.complete && inspected.readiness.ready && state.audio.length === 4;
    const outcome = await runRelease(options.execute, {
      inspect: async () => ({ fingerprint: plan.fingerprint, complete }),
      snapshot: async () => {
        phase = 'private scoped snapshot (before writes)';
        const snapshot = await savePrivateSnapshot({ release: releaseName, fingerprint: plan.fingerprint, actorId: actor.id,
          createdAt: new Date().toISOString(), state, selectedAudio: prepared.manifest,
          intended: { orientation: plan.orientation, band: plan.band, bridges: plan.bridges, mock: plan.mock } });
        console.log(`Private rollback snapshot: ${snapshot}`);
      },
      execute: async (expected) => {
        phase = 'atomic content publication; any error rolls back database writes';
        await publishAtomically<Prisma.TransactionClient>(
          (work) => database.$transaction(work, { isolationLevel: 'RepeatableRead', timeout: 120_000, maxWait: 30_000 }), expected, {
            lockAndFingerprint: async (tx) => {
              await lockSources(tx, state);
              const activeActor = await tx.user.findFirst({ where: { id: actor.id, status: 'ACTIVE', role: { in: ['CONTENT_ADMIN', 'SYSTEM_ADMIN'] } }, select: { id: true } });
              if (!activeActor) throw new Error('Admin no longer active.');
              return makePlan(await readReleaseState(tx, ids), prepared.manifest).fingerprint;
            },
            publish: async (tx) => {
              // Storage writes are additive. A failed transaction may leave unreferenced files; never delete potentially pinned data.
              for (const [index, entry] of prepared.manifest.entries()) {
                if (state.audio.some((artifact) => artifact.id === ids[index])) continue;
                const stored = await storage.put({ prefix: 'ielts-local-beta', body: prepared.waves[index]!, contentType: 'audio/wav' });
                const reread = await storage.read(stored.key); verifyWave(reread);
                if (bytesHash(reread) !== entry.checksum) throw new Error('Stored WAV checksum mismatch.');
                await tx.audioArtifact.create({ data: { id: ids[index]!, audioScriptSlug: `ielts-local-beta-part-${entry.part}`,
                  scriptHash: entry.inputHash, variantKey: releaseName, generationKey: audioIdentity(entry), adapterName: 'local-windows-speech',
                  voiceConfig: { voices: entry.voices, rate: 0, sampleRate: 24000, channels: 1, bitsPerSample: 16, scriptTitle: listening[index]!.title, provenance: 'Original authored dialogue; generated offline using installed System.Speech voices.' },
                  mimeType: 'audio/wav', byteSize: entry.byteSize, checksum: entry.checksum, storageKey: stored.key, status: 'READY' } });
                await tx.auditLog.create({ data: { actorId: actor.id, action: 'PREPARE_IELTS_LOCAL_AUDIO', resourceType: 'AudioArtifact', resourceId: ids[index]!, metadata: { release: releaseName, adapterName: entry.adapterName, checksum: entry.checksum } } });
              }
              const scoped = publisherDatabase(tx);
              const key = (operation: string) => stableUuid(`${releaseName}:${plan.fingerprint}:${operation}`);
              if (plan.work.orientation) {
                const service = new OrientationAdminService(scoped);
                const saved = await service.updateDraft({ expectedRevision: state.orientation.draftRevision, content: plan.orientation });
                const validation = await service.validate({ expectedRevision: saved.draftRevision });
                if (!validation.canPublish) throw new Error('Orientation validation failed.');
                await service.publish(actor.id, { expectedRevision: saved.draftRevision, idempotencyKey: key('orientation') });
              }
              for (const item of plan.bridges.filter((bridge) => bridge.publish)) {
                const service = new IeltsBridgeAdminService(scoped);
                const saved = await service.saveDraft(actor.id, item.id, { expectedRevision: item.revision, idempotencyKey: key(`bridge-save:${item.id}`), content: item.content });
                const command = { expectedRevision: saved.draftRevision, idempotencyKey: key(`bridge-publish:${item.id}`) };
                if (!(await service.validate(item.id, command)).canPublish) throw new Error('Bridge validation failed.');
                await service.publish(actor.id, item.id, command);
              }
              if (plan.work.band) {
                const service = new IeltsBandAdminService(scoped);
                const saved = await service.save(actor.id, { expectedRevision: state.band.draftRevision, idempotencyKey: key('band-save'), content: plan.band });
                const command = { expectedRevision: saved.draftRevision, idempotencyKey: key('band-publish') };
                if (!(await service.validate(command)).canPublish) throw new Error('Band validation failed.');
                await service.publish(actor.id, command);
              }
              if (plan.work.mock) {
                const service = new IeltsMockAdminService(scoped);
                const saved = await service.save(actor.id, state.mock.id, { expectedRevision: state.mock.draftRevision, idempotencyKey: key('mock-save'), content: plan.mock });
                const command = { expectedRevision: saved.draftRevision, idempotencyKey: key('mock-publish') };
                if (!(await service.validate(state.mock.id, command)).canPublish) throw new Error('Mock validation failed.');
                await service.publish(actor.id, state.mock.id, command);
              }
            },
            readiness: async (tx) => {
              const artifacts = await tx.audioArtifact.findMany({ where: { id: { in: ids } }, take: 4 });
              if (artifacts.length !== 4) return false;
              for (const artifact of artifacts) {
                const entry = prepared.manifest[ids.indexOf(artifact.id)]!;
                const bytes = await storage.read(artifact.storageKey); verifyWave(bytes);
                if (bytesHash(bytes) !== entry.checksum || artifact.checksum !== entry.checksum || artifact.byteSize !== bytes.length) return false;
              }
              return (await readIeltsProgramReadiness(tx)).ready;
            },
            enableBeta: async (tx) => {
              const updated = await tx.learningProgram.updateMany({ where: { id: state.program.id, updatedAt: state.program.updatedAt, availabilityStatus: state.program.availabilityStatus }, data: { availabilityStatus: 'BETA' } });
              if (updated.count !== 1) throw new Error('Catalog metadata changed.');
              await tx.auditLog.create({ data: { actorId: actor.id, action: 'ENABLE_IELTS_LOCAL_BETA', resourceType: 'LearningProgram', resourceId: state.program.id,
                oldState: { availabilityStatus: state.program.availabilityStatus }, newState: { availabilityStatus: 'BETA' }, metadata: { release: releaseName, fingerprint: plan.fingerprint, contentHash: hash(plan.mock) } } });
            },
          });
      },
    });
    console.log(`Result: ${outcome}.`);
  } catch {
    // Never echo Prisma errors, connection URLs, environment contents or unrelated record data.
    throw new Error(`IELTS release blocked during ${phase}. No database transaction was committed on failure. Review the scoped state and rerun dry run; no learner data is read or written.`);
  } finally { await database.$disconnect(); }
}
