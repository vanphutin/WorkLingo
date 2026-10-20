import { expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { OrientationAdminService } from '../ielts-orientation/application/orientation-admin.service.js';
import { IELTS_ORIENTATION_SEED } from '../ielts-orientation/infrastructure/seed-ielts-orientation.js';
import { publisherDatabase } from './release.js';

it('runs the real immutable Orientation publisher inside the supplied transaction, including its audit and receipt', async () => {
  const content = structuredClone(IELTS_ORIENTATION_SEED);
  const parent = { id: '10000000-0000-4000-8000-000000000001', slug: 'ielts-orientation', draftRevision: 1,
    draftContent: content, currentPublishedVersionId: null as string | null, status: 'ARCHIVED' };
  const versions: Array<Record<string, unknown>> = []; const audits: unknown[] = []; const receipts: unknown[] = [];
  const transaction = {
    $executeRaw: async () => 1,
    mutationReceipt: { findUnique: async () => null, create: async ({ data }: { data: unknown }) => { receipts.push(data); } },
    ieltsOrientation: { findUnique: async () => parent, update: async ({ data }: { data: Partial<typeof parent> }) => { Object.assign(parent, data); return parent; } },
    orientationMediaAsset: { findMany: async () => [] },
    ieltsOrientationVersion: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, id: '20000000-0000-4000-8000-000000000001' }; versions.push(row); return row;
      },
    },
    auditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } },
  };
  const publisher = new OrientationAdminService(publisherDatabase(transaction as unknown as Prisma.TransactionClient));
  const result = await publisher.publish('30000000-0000-4000-8000-000000000001', {
    expectedRevision: 1, idempotencyKey: '40000000-0000-4000-8000-000000000001',
  });
  expect(result.version).toBe(1);
  expect(versions).toHaveLength(1); expect(versions[0]?.content).toEqual(content);
  expect(parent.status).toBe('PUBLISHED'); expect(parent.currentPublishedVersionId).toBe(result.orientationVersionId);
  expect(audits).toEqual([expect.objectContaining({ action: 'PUBLISH_IELTS_ORIENTATION', resourceId: result.orientationVersionId })]);
  expect(receipts).toEqual([expect.objectContaining({ operation: 'publish-ielts-orientation', responseStatus: 201 })]);
});
