import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { seedIntermediateTopicCatalog } from './seed-topic-catalog.js';

vi.mock('./topic-catalog.js', () => ({ intermediateTopicCatalog: [
  { key: 'restaurants', name: 'Nhà hàng', nameEn: 'Restaurant', aliases: ['restaurent'], description: 'Curated dining' },
] }));

type Group = { id: string; name: string; normalizedName: string; nameEn: string | null; aliases: string[]; catalogKey: string | null; description: string; revision: number };
function setup() {
  const groups: Group[] = [];
  const names: Array<{ normalizedName: string; groupId: string }> = [];
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    intermediateTopicGroup: {
      findUnique: vi.fn(async ({ where }) => groups.find(g => where.id ? g.id === where.id : g.catalogKey === where.catalogKey) ?? null),
      findUniqueOrThrow: vi.fn(async ({ where }) => groups.find(g => g.id === where.id)!),
      create: vi.fn(async ({ data }) => { const group = { id: randomUUID(), revision: 1, ...data }; groups.push(group); return group; }),
      update: vi.fn(async ({ where, data }) => { const group = groups.find(g => g.id === where.id)!; Object.assign(group, data, { revision: group.revision + 1 }); return group; }),
    },
    intermediateTopicGroupName: {
      findMany: vi.fn(async ({ where }) => names.filter(n => where.normalizedName.in.includes(n.normalizedName))),
      deleteMany: vi.fn(async ({ where }) => { for (let i = names.length - 1; i >= 0; i--) if (names[i]!.groupId === where.groupId) names.splice(i, 1); }),
      createMany: vi.fn(async ({ data }) => { names.push(...data); return { count: data.length }; }),
    },
  };
  const database = { $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient;
  const add = (name: string) => {
    const group = { id: randomUUID(), name, normalizedName: name.toLowerCase(), nameEn: null, aliases: [], catalogKey: null, description: 'Custom description', revision: 3 };
    groups.push(group); names.push({ normalizedName: name.toLowerCase(), groupId: group.id }); return group;
  };
  return { groups, names, database, add };
}

describe('Dedicated category catalog seed', () => {
  it('creates categories once and preserves explicit metadata edits on rerun', async () => {
    const s = setup();
    expect(await seedIntermediateTopicCatalog(s.database)).toEqual({ created: 1, reused: 0, skipped: 0, conflicts: [] });
    expect(s.groups[0]).toMatchObject({ name: 'Nhà hàng', nameEn: 'Restaurant', aliases: ['restaurent'], catalogKey: 'restaurants' });
    expect(s.names.map(n => n.normalizedName)).toEqual(['nhà hàng', 'restaurant', 'restaurent']);
    Object.assign(s.groups[0]!, { name: 'Edited', nameEn: null, aliases: [], description: 'Edited description' });
    const before = structuredClone(s.groups);
    expect(await seedIntermediateTopicCatalog(s.database)).toEqual({ created: 0, reused: 1, skipped: 0, conflicts: [] });
    expect(s.groups).toEqual(before);
  });
  it('reuses an unambiguous old name without replacing its ID or custom metadata', async () => {
    const s = setup(); const existing = s.add('Restaurant');
    const result = await seedIntermediateTopicCatalog(s.database);
    expect(result).toMatchObject({ created: 0, reused: 1, skipped: 0 });
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0]).toMatchObject({ id: existing.id, name: 'Restaurant', description: 'Custom description', catalogKey: 'restaurants' });
    expect(s.names.map(n => n.normalizedName)).toEqual(expect.arrayContaining(['nhà hàng', 'restaurant', 'restaurent']));
  });
  it('reports ambiguous matches without merging or editing either group', async () => {
    const s = setup(); const a = s.add('Restaurant'), b = s.add('Nhà hàng');
    const before = structuredClone(s.groups);
    const result = await seedIntermediateTopicCatalog(s.database);
    expect(result).toMatchObject({ created: 0, reused: 0, skipped: 1, conflicts: [{ key: 'restaurants', groupIds: expect.arrayContaining([a.id, b.id]) }] });
    expect(s.groups).toEqual(before);
  });
  it('preserves custom English names and aliases when adopting a match', async () => {
    const s = setup(); const existing = s.add('Restaurant');
    Object.assign(existing, { nameEn: 'Custom dining', aliases: ['Our dining room'] });
    s.names.push({ normalizedName: 'custom dining', groupId: existing.id }, { normalizedName: 'our dining room', groupId: existing.id });
    expect(await seedIntermediateTopicCatalog(s.database)).toMatchObject({ reused: 1, skipped: 0 });
    expect(s.groups[0]).toMatchObject({ nameEn: 'Custom dining', aliases: expect.arrayContaining(['Our dining room', 'Nhà hàng', 'restaurent']) });
  });
  it('skips a name already owned by another catalog key without changing it', async () => {
    const s = setup(); s.add('Restaurant');
    s.groups[0]!.catalogKey = 'different-category';
    const before = structuredClone(s.groups);
    expect(await seedIntermediateTopicCatalog(s.database)).toMatchObject({ created: 0, reused: 0, skipped: 1,
      conflicts: [{ key: 'restaurants', reason: 'CATALOG_KEY_CONFLICT' }] });
    expect(s.groups).toEqual(before);
  });
  it('reports bounded metadata overflow rather than dropping existing aliases', async () => {
    const s = setup(); s.add('Restaurant');
    s.groups[0]!.aliases = Array.from({ length: 20 }, (_, i) => `Existing ${i}`);
    const before = structuredClone(s.groups);
    expect(await seedIntermediateTopicCatalog(s.database)).toMatchObject({ created: 0, reused: 0, skipped: 1,
      conflicts: [{ key: 'restaurants', reason: 'METADATA_LIMIT' }] });
    expect(s.groups).toEqual(before);
  });
});
