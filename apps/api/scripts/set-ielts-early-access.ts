import 'reflect-metadata';
import path from 'node:path';
import { z } from 'zod';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { changeIeltsEarlyAccess } from '../src/ielts-access/ielts-early-access.js';
import { assertLocalDatabase } from '../src/ielts-beta-release/safety.js';
import { readIeltsProgramReadiness } from '../src/learning-programs/application/ielts-program-readiness.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--execute' && arg !== '--revoke' && !arg.startsWith('--email='))
    || new Set(args.map(arg => arg.split('=')[0])).size !== args.length) throw new Error('Use --email=<address> [--execute] [--revoke]. Dry run is the default.');
  const email = z.email().parse(args.find(arg => arg.startsWith('--email='))?.slice(8).trim().toLowerCase());
  const execute = args.includes('--execute');
  const enabled = !args.includes('--revoke');
  process.loadEnvFile(path.resolve(__dirname, '../../../.env'));
  assertLocalDatabase(process.env.DATABASE_URL ?? '');
  const db = new PrismaService({ log: [], errorFormat: 'minimal' });
  try {
    const inspection = await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [user, actor, program, readiness] = await Promise.all([
        tx.user.findUnique({ where: { email }, select: { id: true, status: true, role: true, profile: { select: { ieltsEarlyAccess: true, onboardingStatus: true } } } }),
        tx.user.findFirst({ where: { status: 'ACTIVE', role: { in: ['CONTENT_ADMIN', 'SYSTEM_ADMIN'] } }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
        tx.learningProgram.findUnique({ where: { slug: 'ielts' }, select: { availabilityStatus: true } }),
        readIeltsProgramReadiness(tx),
      ]);
      if (!user || user.status !== 'ACTIVE' || user.role !== 'LEARNER' || !user.profile) throw new Error('An existing active learner profile is required.');
      if (!actor) throw new Error('No active local administrator is available.');
      if (enabled && (!readiness.ready || !program || !['BETA', 'AVAILABLE'].includes(program.availabilityStatus))) throw new Error('IELTS content is not ready for access.');
      return { user, actor, ready: readiness.ready };
    }, { isolationLevel: 'RepeatableRead' });
    console.log(JSON.stringify({ mode: execute ? 'EXECUTE' : 'DRY_RUN', email, previousAccess: inspection.user.profile!.ieltsEarlyAccess,
      requestedAccess: enabled, contentReady: inspection.ready, scope: 'IELTS phase prerequisites only; scores and progress remain unchanged.' }));
    if (!execute) return;
    const result = await db.$transaction(tx => changeIeltsEarlyAccess(tx, inspection.actor.id, inspection.user.id, enabled), { timeout: 15_000 });
    console.log(`Result: ${result}.`);
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Local IELTS access change failed. Check the arguments, local database and active learner/admin status.'); process.exitCode = 1; });
