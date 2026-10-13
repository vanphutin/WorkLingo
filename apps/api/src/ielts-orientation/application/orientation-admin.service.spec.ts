import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { OrientationAdminService } from './orientation-admin.service.js';

const content = {
  title: 'IELTS Orientation', description: 'Introduction',
  slides: ['welcome', 'skills', 'score'].map((slug, index) => ({
    id: `${index + 1}1111111-1111-4111-8111-111111111111`, slug, title: slug,
    body: 'A concise body.', transcript: 'An accessible transcript.',
    imageAssetId: null, audioAssetId: null, question: null,
  })),
};
const now = new Date('2026-10-13T00:00:00.000Z');
const orientation = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'ielts-orientation', status: 'DRAFT',
  draftRevision: 1, draftContent: content, currentPublishedVersionId: null, createdAt: now, updatedAt: now,
};

async function setup() {
  const tx = {
    $executeRaw: vi.fn(),
    auditLog: { create: vi.fn() },
    ieltsOrientation: { findUnique: vi.fn().mockResolvedValue(orientation), update: vi.fn() },
    ieltsOrientationVersion: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    mutationReceipt: { findUnique: vi.fn(), create: vi.fn() },
    orientationMediaAsset: { findMany: vi.fn().mockResolvedValue([]) },
  };
  const database = {
    ieltsOrientation: { findUnique: vi.fn().mockResolvedValue({
      ...orientation, currentPublishedVersion: null, versions: [],
    }) },
    mutationReceipt: { findUnique: vi.fn() },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const module = await Test.createTestingModule({
    providers: [OrientationAdminService, { provide: PrismaService, useValue: database }],
  }).compile();
  return { database, service: module.get(OrientationAdminService), tx };
}

describe('OrientationAdminService', () => {
  it('reads the current draft and version history', async () => {
    const { service } = await setup();
    await expect(service.get()).resolves.toMatchObject({ draftRevision: 1, versions: [] });
});
  it('rejects malformed draft input before persistence', async () => {
    const { database, service } = await setup();
    await expect(service.updateDraft({ expectedRevision: 1, content: {} })).rejects.toBeInstanceOf(BadRequestException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('validates owned draft media and persists VALIDATED', async () => {
    const { service, tx } = await setup();
    await expect(service.validate({ expectedRevision: 1 })).resolves.toMatchObject({ canPublish: true, status: 'VALIDATED' });
    expect(tx.ieltsOrientation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'VALIDATED' } }));
  });

  it('returns an idempotent publish receipt without creating another version', async () => {
    const { database, service } = await setup();
    const input = { expectedRevision: 1, idempotencyKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    const response = { orientationId: orientation.id, orientationVersionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', version: 1, publishedAt: now.toISOString() };
    database.mutationReceipt.findUnique.mockResolvedValue({
      requestHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'), responseBody: response,
    });
    await expect(service.publish('dddddddd-dddd-4ddd-8ddd-dddddddddddd', input)).resolves.toEqual(response);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('archives idempotently even when no current version exists', async () => {
    const { service, tx } = await setup();
    await expect(service.archive('dddddddd-dddd-4ddd-8ddd-dddddddddddd')).resolves.toMatchObject({ versions: [] });
    expect(tx.ieltsOrientation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { currentPublishedVersionId: null, status: 'ARCHIVED' } }));
  });

  it('reports a missing orientation as not found', async () => {
    const { database, service } = await setup();
    database.ieltsOrientation.findUnique.mockResolvedValue(null);
    await expect(service.get()).rejects.toBeInstanceOf(NotFoundException);
  });
});
import { createHash } from 'node:crypto';

