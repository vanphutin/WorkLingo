import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export function normalizedTopicGroupNames(group: { name: string; nameEn?: string | null | undefined; aliases?: readonly string[] | undefined }) {
  return [...new Set([group.name, ...(group.nameEn ? [group.nameEn] : []), ...(group.aliases ?? [])]
    .map(name => name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()))];
}

export async function checkTopicGroupNames(tx: Prisma.TransactionClient, names: string[], groupId?: string) {
  const conflicts = await tx.intermediateTopicGroupName.findMany({
    where: { normalizedName: { in: names }, ...(groupId ? { groupId: { not: groupId } } : {}) },
  });
  if (conflicts.length) throw new ConflictException({ code: 'TOPIC_GROUP_NAME_CONFLICT', message: 'A topic group already uses this name or alias.' });
}

export async function registerTopicGroupNames(tx: Prisma.TransactionClient, groupId: string, names: string[]) {
  await tx.intermediateTopicGroupName.deleteMany({ where: { groupId } });
  await tx.intermediateTopicGroupName.createMany({ data: names.map(normalizedName => ({ normalizedName, groupId })) });
}
