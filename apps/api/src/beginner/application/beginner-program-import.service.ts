import { ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service.js';
import { beginnerSourceInventoryHash, type BeginnerProgramSource } from '../domain/beginner-program-source.js';
import { programImportHash } from '../domain/beginner-program-permission.js';
import { readProgramImportPermission, verifyProgramImportTarget } from '../domain/beginner-program-permission.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { withBeginnerImportServices } from './beginner-import-runtime.js';
import { PROGRAM_CATALOG } from '../../learning-programs/domain/program-catalog.js';
import { requireProgramActor, jsonValue } from '../../learning-programs/application/program-command.js';
import { captureProgramSnapshot } from '../../learning-programs/application/program-release-snapshot.js';
import { requireVocabularySenses } from '../../vocabulary/vocabulary-library.service.js';
import { beginnerEditorialPlan, type BeginnerTarget } from '@worklingo/contracts';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import { randomUUID } from 'node:crypto';
import { PasswordHasher } from '../../auth/infrastructure/password-hasher.js';
import { verifyBeginnerVocabularyEvidence } from '../domain/beginner-vocabulary-evidence.js';

@Injectable()
export class BeginnerProgramImportService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Optional() @Inject(ObjectStorage) private readonly storage?: ObjectStorage) {}
  async dryRun(source: BeginnerProgramSource, database = this.database) {
    await verifyBeginnerVocabularyEvidence(database, source.vocabularyEvidence, source.lessons.flatMap(row => row.vocabulary));
    const program = await database.learningProgram.findUnique({ where: { slug: 'beginner' }, include: { versions: { where: { source: 'AUTHORED', status: 'PUBLISHED' } } } });
    const writeSet = { programId: program?.id ?? '10000000-0000-4000-8000-000000000001', inventoryHash: source.inventoryHash, counts: source.counts, mode: 'BETA_UNSCORED', changes: ['reconcile-beginner-only','technical-ai-reviewer-account-if-absent','publish-8-exact-lessons','bind-exact-vocabulary-with-explicit-exceptions','publish-two-ordered-curricula','publish-immutable-program-version'], lessons: source.lessons.map(row => ({ code: row.code, sourceHash: row.sourceHash, bundleHash: row.bundleHash, activities: row.draft.activities.map(activity => activity.slug), objectives: row.draft.foundation?.objectives.map(objective => objective.slug), audio: row.audio.map(({slug,fileSha256,scriptHash}) => ({slug,fileSha256,scriptHash})), vocabulary: row.vocabulary })), masterWrites: 0, existingLearnerWrites: 0 };
    return { ...writeSet, existingReleases: program?.versions.map(row => row.id) ?? [], hash: programImportHash(writeSet) };
  }
  async apply(source: BeginnerProgramSource, dryRunHash: string, actors?: { editorId: string; reviewerId?: string }) {
    const proposed = await this.dryRun(source);
    if (proposed.hash !== dryRunHash) throw new ConflictException('BEGINNER_DRY_RUN_CHANGED');
    if (beginnerSourceInventoryHash(source.lessons, source.vocabularyEvidence) !== source.inventoryHash) throw new ConflictException('BEGINNER_SOURCE_CHANGED');
    const permission = readProgramImportPermission();
    if (!permission || permission.sourceInventoryHash !== source.inventoryHash || permission.dryRunHash !== dryRunHash || permission.programId !== proposed.programId || !this.storage || !actors || actors.editorId === actors.reviewerId) throw new ConflictException('BEGINNER_IMPORT_PERMISSION_REQUIRED');
    const storage = this.storage;
    return this.database.$transaction(async tx => {
      await verifyProgramImportTarget(tx, permission);
      const editor = await requireProgramActor(tx, actors.editorId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('beginner-r21-program-import'))`;
      await verifyBeginnerVocabularyEvidence(tx, source.vocabularyEvidence, source.lessons.flatMap(row => row.vocabulary));
      const operation = 'beginner:r21:program-import', key = source.inventoryHash;
      const previous = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId: editor.id, operation, idempotencyKey: key } } });
      if (previous) return previous.responseBody;
      let reviewerId = actors.reviewerId;
      if (!reviewerId) {
        const email = 'r21-technical-ai-reviewer@worklingo.invalid';
        const existingReviewer = await tx.user.findUnique({ where: { email } });
        if (existingReviewer && (existingReviewer.displayName !== 'R2.1 AI technical reviewer (not human)' || existingReviewer.role !== 'CONTENT_ADMIN' || existingReviewer.status !== 'ACTIVE')) throw new ConflictException('BEGINNER_REVIEWER_COLLISION');
        reviewerId = existingReviewer?.id ?? (await tx.user.create({ data: { email, passwordHash: await new PasswordHasher().hash(randomUUID() + randomUUID()), displayName: 'R2.1 AI technical reviewer (not human)', role: 'CONTENT_ADMIN', status: 'ACTIVE' } })).id;
      }
      const reviewer = await requireProgramActor(tx, reviewerId);
      if (reviewer.id === editor.id) throw new ConflictException('BEGINNER_INDEPENDENT_REVIEW_REQUIRED');
      const exactSenses = [...new Set(source.lessons.flatMap(row => row.vocabulary.filter(item => item.relationship === 'CONTEXTUAL_SENSE_MATCH').flatMap(item => item.senseIds)))];
      const senses = await requireVocabularySenses(tx, exactSenses);
      for (const mapping of source.lessons.flatMap(row => row.vocabulary).filter(item => item.relationship === 'CONTEXTUAL_SENSE_MATCH')) {
        for (const senseId of mapping.senseIds) {
          const sense = senses.find(row => row.id === senseId);
          if (!sense || sense.lexicalEntryId !== mapping.lexicalEntryId || sense.entry.canonicalForm.trim().toLowerCase() !== mapping.expression.trim().toLowerCase()) throw new ConflictException('BEGINNER_VOCABULARY_MAPPING_CHANGED');
        }
      }
      const existing = await tx.learningProgram.findUnique({ where: { id: permission.programId }, include: { paths: true, versions: true } });
      if (existing && (existing.slug !== 'beginner' || existing.paths.length || existing.versions.length || await tx.learningSession.count({ where: { mission: { level: { path: { programId: existing.id } } } } }))) throw new ConflictException('BEGINNER_EXISTING_CONTENT_RECONCILIATION_REQUIRED');
      const metadata = { name: 'Nền tảng / Beginner', description: 'Tiếng Anh nền tảng cho người Việt, từ giao tiếp ban đầu đến kỹ năng sơ cấp. Beta: nói và viết là bài luyện không chấm điểm.', learningGoal: 'Build foundational communication through guided reading, listening, speaking and writing.', proficiencyLabel: 'Pre-A1–A2', progressionPolicy: 'ACTIVITY_COMPLETION' as const };
      await tx.learningProgram.upsert({ where: { id: permission.programId }, create: { ...PROGRAM_CATALOG[0], ...metadata }, update: { ...metadata, revision: { increment: 1 } } });
      return withBeginnerImportServices(tx, storage, async services => {
        const actor = { id: editor.id, roles: [editor.role] }, reviewActor = { id: reviewer.id, roles: [reviewer.role] };
        const target: BeginnerTarget = { programId: permission.programId };
        const idem = (step: string) => {
          const hex = programImportHash({ inventory: source.inventoryHash, step });
          return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
        };
        const path = await services.authoring.node(actor, 'create-path', target, { programId: target.programId, slug: 'mat-goc', name: 'Mất gốc — Nền tảng giao tiếp', idempotencyKey: idem('path') });
        target.pathId = path.id;
        const level = await services.authoring.node(actor, 'create-stage', target, { pathId: path.id, code: 'MG_F0', name: 'Nền tảng / Pre-A1–A2', cefrReference: 'Pre-A1–A2', order: 1, idempotencyKey: idem('level') });
        target.levelId = level.id;
        const curricula: string[] = [], lessonBindings: { code: string; lessonVersionId: string; sourceHash: string; bundleHash: string }[] = [];
        for (const unit of beginnerEditorialPlan.stages[0]!.units.slice(0, 2)) {
          const mission = await services.authoring.node(actor, 'create-unit', target, { levelId: level.id, slug: unit.code.toLowerCase(), title: unit.title, objective: unit.canDo, order: curricula.length + 1, purpose: 'LEARNING', idempotencyKey: idem(unit.code) });
          const unitTarget = { ...target, missionId: mission.id };
          const objectives = [];
          for (const row of source.lessons.filter(row => row.code.startsWith(unit.code + '-'))) {
            const created = await services.authoring.createDraft(actor, { target: unitTarget, editorialCode: row.code, rawSource: row.rawSource, expectedRevision: null, idempotencyKey: idem(row.code + ':draft') });
            const selected: Record<string, string> = {};
            for (const audio of row.audio) {
              const stored = await storage.put({ body: audio.bytes, contentType: 'audio/wav', prefix: 'beginner-r21-reviewed-audio' });
              const artifact = await tx.audioArtifact.create({ data: { contentImportId: created.draft.id, audioScriptSlug: audio.slug, scriptHash: audio.scriptHash, generationKey: `r21:${created.draft.id}:${audio.slug}:${audio.fileSha256}`, adapterName: 'reviewed-offline-r12b-asset', voiceConfig: { provenance: 'EXACT_REUSED_WAV_NO_PROVIDER_CALL', originalWavSha256: audio.fileSha256, requestSha256: audio.requestSha256 }, mimeType: 'audio/wav', byteSize: audio.bytes.length, checksum: audio.fileSha256, storageKey: stored.key, status: 'READY' } });
              selected[audio.slug] = artifact.id;
            }
            const command = { target: created.target, expectedRevision: created.draft.draftRevision, expectedSourceHash: row.sourceHash, selectedAudioArtifacts: selected };
            await services.authoring.validate(actor, { ...command, idempotencyKey: idem(row.code + ':validate') });
            const review = await services.authoring.review(reviewActor, { ...command, idempotencyKey: idem(row.code + ':technical-ai-review') });
            const published = await services.authoring.publish(actor, { ...command, reviewHash: review.reviewHash, idempotencyKey: idem(row.code + ':publish') });
            const version = await tx.lessonVersion.findUniqueOrThrow({ where: { id: published.lessonVersionId } });
            const snapshot = lessonSnapshotSchema.parse(version.parsedContent);
            lessonBindings.push({ code: row.code, lessonVersionId: version.id, sourceHash: row.sourceHash, bundleHash: row.bundleHash });
            for (const objective of snapshot.foundation!.objectives) objectives.push({ ...objective, evidence: snapshot.activities.filter(activity => snapshot.foundation!.activityObjectives[activity.slug]?.includes(objective.slug)).map(activity => ({ lessonVersionId: version.id, activitySlug: activity.slug, languageBlockSlugs: activity.languageBlockReferences })) });
            const senseIds = [...new Set(row.vocabulary.filter(item => item.relationship === 'CONTEXTUAL_SENSE_MATCH').flatMap(item => item.senseIds))];
            if (senseIds.length) {
              const collection = await services.vocabulary.createCollection({ name: `R2.1 ${row.code} exact contextual vocabulary`, type: 'LESSON', ownerReference: `beginner-r21:${source.inventoryHash}:${row.code}` });
              const vocabularyVersion = await services.vocabulary.createVersion(collection.id, { senseIds });
              await services.vocabulary.publishVersion(vocabularyVersion.id);
              await services.vocabulary.bind(vocabularyVersion.id, { lessonVersionId: version.id });
            }
            await tx.auditLog.create({ data: { actorId: editor.id, action: 'beginner.r21.source-admitted', resourceType: 'LessonVersion', resourceId: version.id, metadata: jsonValue({ code: row.code, sourceHash: row.sourceHash, bundleHash: row.bundleHash, inventoryHash: source.inventoryHash, sourceIdentity: 'COMMITTED_LF', qualification: 'BETA_UNSCORED_NOT_PRODUCTION_QUALIFIED', vocabulary: row.vocabulary }) } });
          }
          const definition = { category: 'grammar', objectives, prerequisiteRevisionIds: curricula.slice(-1) };
          await services.authoring.foundationCommand(actor, 'save', unitTarget, { expectedRevision: null, definition, idempotencyKey: idem(unit.code + ':curriculum-save') });
          await services.authoring.foundationCommand(actor, 'validate', unitTarget, { expectedRevision: 1, idempotencyKey: idem(unit.code + ':curriculum-validate') });
          await services.authoring.foundationCommand(reviewActor, 'review', unitTarget, { expectedRevision: 1, idempotencyKey: idem(unit.code + ':curriculum-review') });
          const revision = await services.authoring.foundationCommand(actor, 'publish', unitTarget, { expectedRevision: 1, idempotencyKey: idem(unit.code + ':curriculum-publish') });
          if (!('id' in revision)) throw new ConflictException('BEGINNER_CURRICULUM_PUBLICATION_FAILED');
          curricula.push(String(revision.id));
          const context = await services.policy.authorize(actor, 'publish', unitTarget, tx);
          await services.curriculum.publishMission(mission.id, editor.id, { expectedRevision: mission.revision, idempotencyKey: idem(unit.code + ':mission-publish') }, context);
        }
        const levelContext = await services.policy.authorize(actor, 'publish', target, tx);
        await services.curriculum.publishLevel(level.id, editor.id, { expectedRevision: level.revision, idempotencyKey: idem('level-publish') }, levelContext);
        const pathContext = await services.policy.authorize(actor, 'publish', { programId: target.programId, pathId: path.id }, tx);
        await services.curriculum.publishPath(path.id, editor.id, { expectedRevision: path.revision, idempotencyKey: idem('path-publish') }, pathContext);
        const program = await tx.learningProgram.findUniqueOrThrow({ where: { id: target.programId } });
        const content = await captureProgramSnapshot(tx, target.programId, curricula);
        content.supportedLanguages = ['en','vi'];
        content.curriculumBindings.forEach(binding => binding.lessons.forEach(lesson => { lesson.estimatedMinutes = 45; }));
        let release = await services.versions.createDraft(editor.id, target.programId, { content, expectedRevision: program.revision, idempotencyKey: idem('release-draft') });
        for (const targetStatus of ['IN_REVIEW','APPROVED','PUBLISHED'] as const) release = await services.versions.transition(targetStatus === 'APPROVED' ? reviewer.id : editor.id, target.programId, release.id, { targetStatus, expectedRevision: release.revision, idempotencyKey: idem('release-' + targetStatus) });
        const result = { programId: target.programId, programVersionId: release.id, inventoryHash: source.inventoryHash, curriculumRevisionIds: curricula, lessonBindings, mode: 'BETA_UNSCORED', technicalReview: 'AI_NOT_HUMAN' };
        await tx.mutationReceipt.create({ data: { actorId: editor.id, operation, idempotencyKey: key, requestHash: programImportHash({ source: source.inventoryHash, dryRunHash }), responseStatus: 200, responseBody: jsonValue(result) } });
        return jsonValue(result);
      });
    }, { timeout: 120_000 });
  }
}
