import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertIsolatedTarget, reconcileManifest, sourceRegistry } from './operations.js';

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'validate' || command === 'dry-run') {
    if (!argument || statSync(argument).size > 64 * 1024 * 1024) throw new Error('Provide a manifest file smaller than 64 MiB.');
    const result = reconcileManifest(JSON.parse(readFileSync(argument, 'utf8')));
    process.stdout.write(`${JSON.stringify({ ...result, mode: command, databaseWrites: 0 })}\n`);
    if (result.status === 'INCOMPLETE') process.exitCode = 2;
    return;
  }
  if (command !== 'registry' || argument !== '--isolated') throw new Error('Usage: cli.ts validate|dry-run manifest.json OR registry --isolated');
  const envFile = path.resolve(__dirname, '../../../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const target = process.env.TEST_DATABASE_URL;
  if (!target) throw new Error('TEST_DATABASE_URL must name the isolated target.');
  assertIsolatedTarget(target);
  const db = new PrismaClient({ datasourceUrl: target });
  try {
    for (const source of sourceRegistry) {
      await db.vocabularySource.upsert({ where: { providerName_sourceUrl: { providerName: 'LanGeek', sourceUrl: source.sourceUrl } }, create: { providerName: 'LanGeek', title: `CEFR ${source.cefrLevel} PDF`, sourceUrl: source.sourceUrl, attributionRequirements: 'LanGeek — reuse requires separately verified permission.' }, update: {} });
    }
    process.stdout.write(`${JSON.stringify({ sources: 5, mode: 'metadata-only', contentImported: 0, approvalChanged: false })}\n`);
  } finally { await db.$disconnect(); }
}
void main().catch(() => { process.stderr.write('Vocabulary operation failed; check arguments, isolated target and validation report. No source content is logged.\n'); process.exitCode = 1; });
