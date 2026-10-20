import type { PrismaClient } from '@prisma/client';
import { createIntermediateTopicGroupSchema } from '@worklingo/contracts';
import { intermediateTopicCatalog } from './topic-catalog.js';
import { lockTopicGroups } from './topic-group-lock.js';
import { normalizedTopicGroupNames, registerTopicGroupNames } from './topic-group-names.js';

export type TopicCatalogConflict = { key: string; groupIds: string[]; reason: 'AMBIGUOUS_NAMES' | 'CATALOG_KEY_CONFLICT' | 'METADATA_LIMIT' };
export type TopicCatalogSeedResult = { created: number; reused: number; skipped: number; conflicts: TopicCatalogConflict[] };

/** Category-only seed. Never creates lessons, questions, imports or memberships. */
export async function seedIntermediateTopicCatalog(database: PrismaClient): Promise<TopicCatalogSeedResult> {
  const result: TopicCatalogSeedResult = { created: 0, reused: 0, skipped: 0, conflicts: [] };
  for (const entry of intermediateTopicCatalog) {
    const parsed = createIntermediateTopicGroupSchema.parse({ name: entry.name, nameEn: entry.nameEn, aliases: [...entry.aliases], description: entry.description });
    const data = { name: parsed.name, description: parsed.description, nameEn: parsed.nameEn ?? entry.nameEn, aliases: parsed.aliases ?? [...entry.aliases] };
    const outcome = await database.$transaction(async tx => {
      await lockTopicGroups(tx);
      // Once adopted, the key is authoritative. A rerun never restores metadata
      // explicitly renamed or cleared by an administrator.
      const keyed = await tx.intermediateTopicGroup.findUnique({ where: { catalogKey: entry.key } });
      if (keyed) return { kind: 'reused' as const };

      const names = normalizedTopicGroupNames(data);
      const matches = await tx.intermediateTopicGroupName.findMany({ where: { normalizedName: { in: names } } });
      const groupIds = [...new Set(matches.map(match => match.groupId))].sort();
      if (groupIds.length > 1) return { kind: 'skipped' as const, conflict: { key: entry.key, groupIds, reason: 'AMBIGUOUS_NAMES' as const } };

      if (!groupIds.length) {
        const group = await tx.intermediateTopicGroup.create({ data: { ...data, normalizedName: data.name.toLowerCase(), catalogKey: entry.key } });
        await registerTopicGroupNames(tx, group.id, names);
        return { kind: 'created' as const };
      }

      const existing = await tx.intermediateTopicGroup.findUniqueOrThrow({ where: { id: groupIds[0]! } });
      if (existing.catalogKey) return { kind: 'skipped' as const, conflict: { key: entry.key, groupIds, reason: 'CATALOG_KEY_CONFLICT' as const } };
      const nameEn = existing.nameEn ?? data.nameEn;
      const seen = new Set(normalizedTopicGroupNames({ name: existing.name, nameEn }));
      const aliases = [...existing.aliases, data.name, data.nameEn, ...data.aliases].filter(name => {
        const normalized = normalizedTopicGroupNames({ name })[0]!;
        if (seen.has(normalized)) return false;
        seen.add(normalized); return true;
      });
      if (aliases.length > 20) return { kind: 'skipped' as const, conflict: { key: entry.key, groupIds, reason: 'METADATA_LIMIT' as const } };
      const adopted = await tx.intermediateTopicGroup.update({ where: { id: existing.id },
        data: { catalogKey: entry.key, nameEn, aliases, revision: { increment: 1 } } });
      await registerTopicGroupNames(tx, adopted.id, normalizedTopicGroupNames(adopted));
      return { kind: 'reused' as const };
    }, { timeout: 15_000 });
    result[outcome.kind]++;
    if (outcome.kind === 'skipped') result.conflicts.push(outcome.conflict);
  }
  return result;
}
