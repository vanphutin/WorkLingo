import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { analyzeLessonSource } from '@worklingo/content-format';
import { ContentAuthoringErrorCode } from '@worklingo/contracts';
import { canonicalLessonSource } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import { ContentPublisherService } from './content-publisher.service.js';

describe('ContentPublisherService', () => {
  const actorId = randomUUID();
  const importId = randomUUID();
  const validSource = canonicalLessonSource;
  const validHash = createHash('sha256').update(validSource).digest('hex');
  const validAnalysis = analyzeLessonSource(validSource);

  it('rejects publish when expectedDraftRevision does not match current revision with 409 DRAFT_REVISION_CONFLICT', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 2,
          sourceHash: validHash,
          status: 'VALIDATED',
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: validHash,
        idempotencyKey: 'idemp-rev-mismatch',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        statusCode: 409,
      }),
    });
  });

  it('rejects publish when expectedSourceHash does not match current hash with 409 SOURCE_HASH_MISMATCH', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 1,
          sourceHash: validHash,
          status: 'VALIDATED',
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: 'wrong-hash',
        idempotencyKey: 'idemp-hash-mismatch',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.SOURCE_HASH_MISMATCH,
        statusCode: 409,
      }),
    });
  });

  it('rejects publish when import is already published with 409 VERSION_ALREADY_PUBLISHED', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 1,
          sourceHash: validHash,
          status: 'PUBLISHED',
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: validHash,
        idempotencyKey: 'idemp-already-pub',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.VERSION_ALREADY_PUBLISHED,
        statusCode: 409,
      }),
    });
  });

  it('rejects publish when content is unvalidated or has stale validation with 422 CONTENT_VALIDATION_FAILED', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 1,
          sourceHash: validHash,
          status: 'DRAFT', // unvalidated
          validationHash: null,
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: validHash,
        idempotencyKey: 'idemp-unvalidated',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED,
        statusCode: 422,
      }),
    });
  });

  it('rejects publish when required listening audio is missing or not ready with 422 AUDIO_NOT_READY', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 1,
          sourceHash: validHash,
          status: 'VALIDATED',
          validationHash: validHash,
          rawSource: validSource,
          normalizedPreview: validAnalysis.normalizedDraft,
          validationReport: { issues: [], issuesTruncated: false },
          audioArtifacts: [], // No audio artifacts!
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: validHash,
        idempotencyKey: 'idemp-no-audio',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
        statusCode: 422,
      }),
    });
  });

  it('rejects publish when audio artifact scriptHash does not match current script with 422 AUDIO_SCRIPT_STALE', async () => {
    const database = {
      mutationReceipt: { findUnique: vi.fn().mockResolvedValue(null) },
      contentImport: {
        findUnique: vi.fn().mockResolvedValue({
          id: importId,
          draftRevision: 1,
          sourceHash: validHash,
          status: 'VALIDATED',
          validationHash: validHash,
          rawSource: validSource,
          normalizedPreview: validAnalysis.normalizedDraft,
          validationReport: { issues: [], issuesTruncated: false },
          audioArtifacts: [
            {
              id: '00000000-0000-4000-8000-000000000003',
              contentImportId: importId,
              audioScriptSlug: 'complaint-call',
              scriptHash: 'stale-old-hash',
              status: 'READY',
            },
          ],
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 1,
        expectedSourceHash: validHash,
        idempotencyKey: 'idemp-stale-audio',
        selectedAudioArtifacts: {
          'complaint-call': '00000000-0000-4000-8000-000000000003',
        },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.AUDIO_SCRIPT_STALE,
        statusCode: 422,
      }),
    });
  });

  it('replays identical publish request from receipt and detects key reuse conflict', async () => {
    const cachedResult = {
      importId,
      lessonId: randomUUID(),
      lessonVersionId: randomUUID(),
      version: 1,
      status: 'PUBLISHED',
      publishedAt: '2026-10-04T00:00:00.000Z',
    };

    const database = {
      mutationReceipt: {
        findUnique: vi.fn().mockResolvedValue({
          id: randomUUID(),
          actorId,
          operation: 'publish',
          idempotencyKey: 'idemp-replay',
          requestHash: createHash('sha256')
            .update(
              JSON.stringify({
                expectedDraftRevision: 1,
                expectedSourceHash: validHash,
                idempotencyKey: 'idemp-replay',
              }),
            )
            .digest('hex'),
          responseStatus: 200,
          responseBody: cachedResult,
        }),
      },
    } as unknown as PrismaService;

    const service = new ContentPublisherService(database);

    // 1. Same request payload returns cached result
    const replayed = await service.publish(importId, actorId, {
      expectedDraftRevision: 1,
      expectedSourceHash: validHash,
      idempotencyKey: 'idemp-replay',
    });
    expect(replayed).toEqual(cachedResult);

    // 2. Different payload with same key throws 409 IDEMPOTENCY_KEY_REUSED
    await expect(
      service.publish(importId, actorId, {
        expectedDraftRevision: 2,
        expectedSourceHash: 'other-hash',
        idempotencyKey: 'idemp-replay',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
        statusCode: 409,
      }),
    });
  });
});

it('denies synthetic pre-existing validated 1.2 import before mutation/provider work',async()=>{
  const transaction=vi.fn();const database={mutationReceipt:{findUnique:async()=>null},contentImport:{findUnique:async()=>({rawSource:'FORMAT: WorkLingoLesson/1.2',status:'VALIDATED',draftRevision:1,sourceHash:'hash'})},$transaction:transaction} as unknown as PrismaService;
  await expect(new ContentPublisherService(database).publish('import','actor',{expectedDraftRevision:1,expectedSourceHash:'hash',idempotencyKey:'key'})).rejects.toMatchObject({response:{code:'BEGINNER_AUTHORING_DISABLED'}});
  expect(transaction).not.toHaveBeenCalled();
});

import {BeginnerAuthoringPolicy} from '../../beginner/domain/beginner-authoring-policy.js';
import {fixtureActor,fixtureTarget,fixturePermission} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import type {Prisma} from '@prisma/client';
it('rejects a wrong scoped import before replaying a publish receipt',async()=>{
 const target={...fixtureTarget,lessonId:randomUUID(),importId:randomUUID()};
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>fixturePermission(),verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
 const context=await policy.authorize(fixtureActor,'publish',target,{} as Prisma.TransactionClient);
 const input={expectedDraftRevision:1,expectedSourceHash:'a'.repeat(64),idempotencyKey:'scoped-publish'};
 const requestHash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const lookup=vi.fn().mockResolvedValue({requestHash,responseBody:{lessonVersionId:'wrong-receipt'}});
 const service=new ContentPublisherService({mutationReceipt:{findUnique:lookup}} as unknown as PrismaService);
 await expect(service.publish(randomUUID(),fixtureActor.id,input,{context,reviewHash:'b'.repeat(64)})).rejects.toMatchObject({response:{code:'BEGINNER_SCOPE_MISMATCH'}});
 expect(lookup).not.toHaveBeenCalled();
});

it('denies generic withdrawal of a Beginner version before any history write',async()=>{
 const version={id:randomUUID(),lessonId:randomUUID(),status:'PUBLISHED',parsedContent:{formatVersion:'WorkLingoLesson/1.2'},lesson:{slug:'beginner-fixture'}};
 const update=vi.fn(),tx={$executeRaw:vi.fn(),lessonVersion:{findUnique:vi.fn().mockResolvedValue(version),update},lesson:{updateMany:vi.fn()},auditLog:{create:vi.fn()}};
 const db={...tx,$transaction:async(fn:(tx:unknown)=>unknown)=>fn(tx)};
 await expect(new ContentPublisherService(db as unknown as PrismaService).archiveLessonVersion(version.id,fixtureActor.id)).rejects.toMatchObject({response:{code:'BEGINNER_AUTHORING_DISABLED'}});
 expect(update).not.toHaveBeenCalled();
});
