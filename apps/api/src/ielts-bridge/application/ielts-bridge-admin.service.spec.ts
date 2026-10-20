import { createHash } from 'node:crypto';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ieltsBridgeStageTypes } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { IeltsBridgeAdminService } from './ielts-bridge-admin.service.js';

const content = {
  title: 'Listening form completion', description: 'Learn to predict and verify form answers.',
  skill: 'listening' as const, questionType: 'listening_form_completion' as const, required: true,
  stages: ieltsBridgeStageTypes.map((type, index) => ({
    slug: type.replaceAll('_', '-'), type, title: `Stage ${index + 1}`,
    instruction: 'Use meaning, grammar and context together.', strategySteps: ['Read the complete prompt.'],
    timeLimitSeconds: type === 'timed_practice' ? 90 : null,
    task: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
      ? { kind: 'single_choice' as const, prompt: 'Choose the supported answer.', options: ['A', 'B'], answerIndex: 0 }
      : { kind: 'instruction' as const },
    feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
      ? { correct: 'The evidence supports A.', incorrect: 'Review the evidence.' } : null,
  })),
};
const now = new Date('2026-10-13T00:00:00.000Z');
const moduleRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'listening-form-completion', status: 'DRAFT',
  draftRevision: 1, draftContent: content, currentPublishedVersionId: null, createdAt: now, updatedAt: now,
};

async function setup() {
  const tx = {
    $executeRaw: vi.fn(), auditLog: { create: vi.fn() }, mutationReceipt: { findUnique: vi.fn(), create: vi.fn() },
    ieltsBridgeModule: { findUnique: vi.fn().mockResolvedValue(moduleRecord), create: vi.fn(), update: vi.fn() },
    ieltsBridgeModuleVersion: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
  const database = {
    ieltsBridgeModule: {
      findMany: vi.fn().mockResolvedValue([{ ...moduleRecord, currentPublishedVersion: null, versions: [] }]),
      findUnique: vi.fn().mockResolvedValue({ ...moduleRecord, currentPublishedVersion: null, versions: [] }),
    },
    mutationReceipt: { findUnique: vi.fn() },
    $transaction: vi.fn((work: (value: typeof tx) => unknown) => work(tx)),
  };
  const testingModule = await Test.createTestingModule({
    providers: [IeltsBridgeAdminService, { provide: PrismaService, useValue: database }],
  }).compile();
  return { database, service: testingModule.get(IeltsBridgeAdminService), tx };
}

describe('IeltsBridgeAdminService', () => {
  it('creates multiple modules of the same question type with distinct stable slugs', async () => {
    const { service, tx } = await setup();
    const slugs = new Set<string>([moduleRecord.slug]);
    tx.ieltsBridgeModule.create.mockImplementation(async ({ data }: { data: { id: string; slug: string } }) => {
      if (slugs.has(data.slug)) throw new Error('Unique slug collision');
      slugs.add(data.slug);
      return { ...moduleRecord, ...data };
    });
    await service.saveDraft('actor', null, { expectedRevision: null, idempotencyKey: crypto.randomUUID(), content });
    await service.saveDraft('actor', null, { expectedRevision: null, idempotencyKey: crypto.randomUUID(), content });
    expect(slugs.size).toBe(3);
    expect(tx.ieltsBridgeModule.create.mock.calls.map(([input]) => input.data.slug)).toEqual([
      expect.stringMatching(/^listening-form-completion-[0-9a-f-]{36}$/u), expect.stringMatching(/^listening-form-completion-[0-9a-f-]{36}$/u),
    ]);
    await service.saveDraft('actor', moduleRecord.id, { expectedRevision: 1, idempotencyKey: crypto.randomUUID(), content });
    expect(tx.ieltsBridgeModule.update.mock.calls.at(-1)?.[0].data).not.toHaveProperty('slug');
  });

  it('lists bridge modules with immutable version history', async () => {
    const { service } = await setup();
    await expect(service.list()).resolves.toEqual([expect.objectContaining({ id: moduleRecord.id, draftRevision: 1 })]);
  });

  it('rejects malformed draft input before persistence', async () => {
    const { database, service } = await setup();
    await expect(service.saveDraft('actor', moduleRecord.id, {
      expectedRevision: 1, idempotencyKey: crypto.randomUUID(), content: {},
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a stale draft revision under the module lock', async () => {
    const { service } = await setup();
    await expect(service.saveDraft('actor', moduleRecord.id, {
      expectedRevision: 2, idempotencyKey: crypto.randomUUID(), content,
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates a complete ten-stage draft', async () => {
    const { service, tx } = await setup();
    await expect(service.validate(moduleRecord.id, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() }))
      .resolves.toMatchObject({ moduleId: moduleRecord.id, canPublish: true, status: 'VALIDATED' });
    expect(tx.ieltsBridgeModule.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'VALIDATED' } }));
  });

  it('replays an idempotent publish without creating another version', async () => {
    const { database, service } = await setup();
    const input = { expectedRevision: 1, idempotencyKey: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
    const response = { moduleId: moduleRecord.id, moduleVersionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', version: 1, publishedAt: now.toISOString() };
    database.mutationReceipt.findUnique.mockResolvedValue({
      requestHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'), responseBody: response,
    });
    await expect(service.publish('actor', moduleRecord.id, input)).resolves.toEqual(response);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it('archives the module while retaining version history', async () => {
    const { service, tx } = await setup();
    await expect(service.archive('actor', moduleRecord.id)).resolves.toMatchObject({ status: 'DRAFT' });
    expect(tx.ieltsBridgeModule.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { currentPublishedVersionId: null, status: 'ARCHIVED' },
    }));
  });

  it('reports a missing bridge module', async () => {
    const { database, service } = await setup();
    database.ieltsBridgeModule.findUnique.mockResolvedValue(null);
    await expect(service.get(moduleRecord.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
