import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { OrientationMediaService } from './orientation-media.service.js';

async function setup() {
  const now = new Date('2026-10-13T00:00:00.000Z');
  const database = {
    ieltsOrientation: { findUnique: vi.fn().mockResolvedValue({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }) },
    orientationMediaAsset: {
      create: vi.fn().mockResolvedValue({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', kind: 'IMAGE', fileName: 'slide.png', mimeType: 'image/png', byteSize: 3, createdAt: now }),
      findFirst: vi.fn(),
    },
  };
  const storage = { put: vi.fn().mockResolvedValue({ key: 'orientation/key', size: 3, contentType: 'image/png' }), read: vi.fn(), delete: vi.fn() };
  const module = await Test.createTestingModule({ providers: [
    OrientationMediaService,
    { provide: PrismaService, useValue: database },
    { provide: ObjectStorage, useValue: storage },
  ] }).compile();
  return { database, service: module.get(OrientationMediaService), storage };
}

describe('OrientationMediaService', () => {
  it('stores allowlisted media under a generated local storage key', async () => {
    const { service, storage } = await setup();
    await expect(service.upload('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'IMAGE', {
      body: Buffer.from('png'), fileName: 'slide.png', mimeType: 'image/png',
    })).resolves.toMatchObject({ kind: 'IMAGE', contentUrl: expect.stringContaining('/content') });
    expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'ielts-orientation' }));
  });

  it('rejects a MIME type that does not match the declared media kind', async () => {
    const { service, storage } = await setup();
    await expect(service.upload('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'IMAGE', {
      body: Buffer.from('text'), fileName: 'slide.txt', mimeType: 'text/plain',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('does not expose missing or foreign media', async () => {
    const { service } = await setup();
    await expect(service.get('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).rejects.toBeInstanceOf(NotFoundException);
  });
});
