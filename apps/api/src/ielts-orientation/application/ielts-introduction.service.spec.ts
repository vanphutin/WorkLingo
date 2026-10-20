import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { IeltsIntroductionService } from './ielts-introduction.service.js';

describe('Introduction ownership and read boundaries', () => {
  it('does not serve an unreferenced media asset from a current presentation', async () => {
    const versionId = crypto.randomUUID();
    const module = await Test.createTestingModule({ providers: [IeltsIntroductionService,
      { provide: PrismaService, useValue: {
        user: { findUnique: async () => ({ role: 'LEARNER', status: 'ACTIVE', profile: { onboardingStatus: 'COMPLETE' } }) },
        learningProgram: { findUnique: async () => ({ availabilityStatus: 'BETA' }) },
        ieltsOrientation: { findUnique: async () => ({ status: 'PUBLISHED', currentPublishedVersion: { id: versionId, status: 'PUBLISHED' } }) },
        ieltsOrientationVersion: { findUnique: async () => ({ id: versionId, content: { title: 'Intro', description: 'Explore IELTS.', slides: Array.from({ length: 3 }, (_, i) => ({ id: crypto.randomUUID(), slug: `intro-${i}`, title: 'Introduction', body: 'Four skills.', transcript: 'Four skills.', imageAssetId: null, audioAssetId: null, question: null })) } }) },
        ieltsIntroductionVisit: { findFirst: async () => null }, orientationProgress: { findFirst: async () => null },
      } },
      { provide: ConfigService, useValue: { get: () => 'v3' } },
      { provide: ObjectStorage, useValue: {} },
    ] }).compile();
    await expect(module.get(IeltsIntroductionService).getMedia(crypto.randomUUID(), crypto.randomUUID(), versionId)).rejects.toMatchObject({ status: 404 });
    await module.close();
  });
});
