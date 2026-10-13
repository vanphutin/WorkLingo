import { describe, expect, it, vi } from 'vitest';

import { IELTS_BRIDGE_SEEDS, seedIeltsBridge } from './seed-ielts-bridge.js';

describe('IELTS Bridge seed', () => {
  it('provides one valid required ten-stage module for every skill', () => {
    expect(IELTS_BRIDGE_SEEDS).toHaveLength(4);
    expect(new Set(IELTS_BRIDGE_SEEDS.map((seed) => seed.skill))).toEqual(new Set(['listening', 'reading', 'writing', 'speaking']));
    expect(IELTS_BRIDGE_SEEDS.every((seed) => seed.required && seed.stages.length === 10)).toBe(true);
  });

  it('publishes version one idempotently for each module', async () => {
    const tx = {
      ieltsBridgeModule: {
        upsert: vi.fn().mockImplementation(({ create }) => ({ id: `module-${create.slug}`, status: 'DRAFT', currentPublishedVersionId: null })),
        update: vi.fn(),
      },
      ieltsBridgeModuleVersion: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => ({ id: `version-${data.moduleId}` })),
      },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };

    await seedIeltsBridge(database as Parameters<typeof seedIeltsBridge>[0]);

    expect(database.$transaction).toHaveBeenCalledTimes(4);
    expect(tx.ieltsBridgeModuleVersion.create).toHaveBeenCalledTimes(4);
    expect(tx.ieltsBridgeModule.update).toHaveBeenCalledTimes(4);
  });

  it('does not reset an existing published or archived module to seed version one', async () => {
    const tx = {
      ieltsBridgeModule: {
        upsert: vi.fn().mockResolvedValue({ id: 'existing', status: 'PUBLISHED', currentPublishedVersionId: 'newer-version' }),
        update: vi.fn(),
      },
      ieltsBridgeModuleVersion: { findUnique: vi.fn(), create: vi.fn() },
    };
    const database = { $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)) };

    await seedIeltsBridge(database as Parameters<typeof seedIeltsBridge>[0]);

    expect(tx.ieltsBridgeModuleVersion.findUnique).not.toHaveBeenCalled();
    expect(tx.ieltsBridgeModule.update).not.toHaveBeenCalled();
  });
});
