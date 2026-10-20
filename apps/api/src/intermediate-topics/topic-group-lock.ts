import type { Prisma } from '@prisma/client';

// Taxonomy mutations and topic publication acquire this first, before the
// publisher's lesson-slug and import locks. This also serializes group deletion
// with assignment/publication of drafts that are not linked to a lesson yet.
export async function lockTopicGroups(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(74291, 1)`;
}
