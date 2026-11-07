import 'reflect-metadata';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { BeginnerProgramImportService } from '../src/beginner/application/beginner-program-import.service.js';
import { reconcileBeginnerSources } from '../src/beginner/domain/beginner-program-source.js';
import { programImportHash } from '../src/beginner/domain/beginner-program-permission.js';
import { ObjectStorage } from '../src/storage/domain/object-storage.port.js';
import { BeginnerImportAudioStorage } from '../src/beginner/infrastructure/beginner-import-audio-storage.js';

async function main() {
const flags = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  if (!key || !value || !['--mode','--report','--backup','--authority','--actor-id','--permission-file'].includes(key) || flags.has(key)) throw new Error('INVALID_IMPORT_ARGUMENT');
  flags.set(key, value);
}
const mode = flags.get('--mode');
if (!['dry-run','apply'].includes(mode ?? '') || !flags.has('--report') || !process.env.DATABASE_URL || !process.env.WORKLINGO_DATA_DIR) throw new Error('IMPORT_TARGET_AND_REPORT_REQUIRED');
@Module({}) class ImportModule {}
const context = await NestFactory.createApplicationContext({ module: ImportModule, providers: [PrismaService, BeginnerProgramImportService, { provide: ObjectStorage, useFactory: () => new BeginnerImportAudioStorage(process.env.WORKLINGO_DATA_DIR!) }] }, { logger: false, abortOnError: false });
try {
  const database = context.get(PrismaService), service = context.get(BeginnerProgramImportService);
  const source = await reconcileBeginnerSources(path.resolve('../..'));
  const [identity] = await database.$queryRaw<{ database: string; role: string; serverIdentity: string }[]>`SELECT current_database() AS database,current_user AS role,(SELECT system_identifier::text FROM pg_control_system()) AS "serverIdentity"`;
  if (!identity) throw new Error('IMPORT_DATABASE_IDENTITY_REQUIRED');
  const migrations = await database.$queryRaw<{ name: string }[]>`SELECT migration_name AS name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
  if (!migrations.some(row => row.name === '20261031000100_program_analytics_indexes')) throw new Error('IMPORT_SCHEMA_NOT_READY');
  const dryRun = await service.dryRun(source);
  const url = new URL(process.env.DATABASE_URL);
  const report = { kind: 'R21_BEGINNER_IMPORT', database: { host: url.hostname, port: Number(url.port || 5432), ...identity }, migrationCount: migrations.length, dryRun, source: source.lessons.map(row => ({ code: row.code, sourceHash: row.sourceHash, checkoutHash: row.checkoutHash, bundleHash: row.bundleHash, audio: row.audio.map(({ slug, fileSha256, scriptHash }) => ({ slug, fileSha256, scriptHash })) })) };
  if (mode === 'dry-run') {
    writeFileSync(flags.get('--report')!, JSON.stringify(report, null, 2));
    process.stdout.write(JSON.stringify({ mode, database: identity.database, counts: source.counts, inventoryHash: source.inventoryHash, dryRunHash: dryRun.hash, report: flags.get('--report') }) + '\n');
  } else {
    const authorityFile = flags.get('--authority'), backupFile = flags.get('--backup'), permissionFile = flags.get('--permission-file'), actorId = flags.get('--actor-id');
    if (!authorityFile || !backupFile || !permissionFile || !actorId) throw new Error('IMPORT_AUTHORITY_BACKUP_ACTOR_REQUIRED');
    const previousReport = JSON.parse(readFileSync(flags.get('--report')!, 'utf8')) as typeof report;
    if (previousReport.dryRun.hash !== dryRun.hash || previousReport.database.serverIdentity !== identity.serverIdentity || previousReport.database.database !== identity.database || previousReport.database.host !== url.hostname || previousReport.database.port !== Number(url.port || 5432)) throw new Error('BEGINNER_DRY_RUN_CHANGED');
    const authority = readFileSync(authorityFile, 'utf8');
    if (!authority.includes('R2.1') || !authority.includes('primary database') || !authority.includes('publish')) throw new Error('IMPORT_AUTHORITY_REQUIRED');
    const backupHash = createHash('sha256').update(readFileSync(backupFile)).digest('hex');
    const issuedAt = new Date(), expiresAt = new Date(issuedAt.getTime() + 4 * 60 * 60 * 1000);
    const record = { schemaVersion: 3, mode: 'PROGRAM_IMPORT', approvalId: 'r21-' + randomBytes(6).toString('hex'), runId: randomBytes(6).toString('hex'), environmentId: `r21-${identity.serverIdentity}`, programId: dryRun.programId, database: { host: url.hostname, port: Number(url.port || 5432), name: identity.database, role: identity.role, serverIdentity: identity.serverIdentity }, storageRoot: process.env.WORKLINGO_DATA_DIR, registryRoot: path.dirname(permissionFile), approvalRoot: path.dirname(permissionFile), ownedTempRoot: path.dirname(permissionFile), actions: ['read','author','validate','review','publish'], issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString(), revoked: false, approvedBy: 'WorkLingo product owner (human user mission, AI execution)', authorizationSource: `R2.1 supplied mission SHA256:${createHash('sha256').update(authority).digest('hex')}`, sourceInventoryHash: source.inventoryHash, backupHash, dryRunHash: dryRun.hash };
    const bytes = JSON.stringify({ ...record, recordHash: programImportHash(record) }, null, 2);
    writeFileSync(permissionFile, bytes, { flag: 'wx' });
    process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_FILE = permissionFile;
    process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_SHA256 = createHash('sha256').update(bytes).digest('hex');
    const result = await service.apply(source, dryRun.hash, { editorId: actorId });
    writeFileSync(flags.get('--report')!, JSON.stringify({ ...report, result, completedAt: new Date().toISOString() }, null, 2));
    process.stdout.write(JSON.stringify({ mode, result }) + '\n');
  }
} finally { await context.close(); }
}
void main().catch(error => { process.stderr.write((error instanceof Error ? error.stack : String(error)) + '\n'); process.exitCode = 1; });
