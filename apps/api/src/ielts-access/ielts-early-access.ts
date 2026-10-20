import type { Prisma } from '@prisma/client';

export async function hasIeltsEarlyAccess(db: Pick<Prisma.TransactionClient, 'learnerProfile'>, learnerId: string): Promise<boolean> {
  const profile = await db.learnerProfile.findUnique({ where: { userId: learnerId },
    select: { ieltsEarlyAccess: true, user: { select: { status: true, role: true } } } });
  return profile?.ieltsEarlyAccess === true && profile.user.status === 'ACTIVE' && profile.user.role === 'LEARNER';
}

/** Call inside a transaction. The audited access flag never represents earned progress. */
export async function changeIeltsEarlyAccess(db: Prisma.TransactionClient, actorId: string, learnerId: string, enabled: boolean): Promise<'UPDATED' | 'UNCHANGED'> {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-early-access:' + learnerId}))`;
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { status: true, role: true } });
  if (!actor || actor.status !== 'ACTIVE' || !['CONTENT_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role)) throw new Error('An active content/system admin is required.');
  const learner = await db.user.findUnique({ where: { id: learnerId }, select: { status: true, role: true, profile: { select: { ieltsEarlyAccess: true } } } });
  if (!learner || learner.status !== 'ACTIVE' || learner.role !== 'LEARNER' || !learner.profile) throw new Error('An existing active learner profile is required.');
  const previous = learner.profile.ieltsEarlyAccess;
  if (previous === enabled) return 'UNCHANGED';
  const result = await db.learnerProfile.updateMany({ where: { userId: learnerId, ieltsEarlyAccess: previous }, data: { ieltsEarlyAccess: enabled } });
  if (result.count !== 1) throw new Error('Access changed concurrently; retry inspection.');
  await db.auditLog.create({ data: { actorId, action: enabled ? 'GRANT_IELTS_EARLY_ACCESS' : 'REVOKE_IELTS_EARLY_ACCESS',
    resourceType: 'LearnerProfile', resourceId: learnerId, oldState: { ieltsEarlyAccess: previous }, newState: { ieltsEarlyAccess: enabled },
    metadata: { scope: 'IELTS prerequisite admission only', source: 'Explicit local administrator decision', preservesLearningEvidence: true } } });
  return 'UPDATED';
}
