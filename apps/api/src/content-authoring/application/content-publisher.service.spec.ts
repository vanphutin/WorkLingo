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

import {parseLessonSource,audioScriptFingerprintText} from '@worklingo/content-format';
it('rejects unbound legacy import whose slug resolves to a Beginner lesson before publication writes',async()=>{
 const source=canonicalLessonSource,sourceHash=createHash('sha256').update(source).digest('hex'),parsed=parseLessonSource(source);
 const importId=randomUUID(),lessonId=randomUUID();
 const artifacts=parsed.document.audioScripts.map(script=>({id:randomUUID(),contentImportId:importId,audioScriptSlug:script.slug,status:'READY',scriptHash:createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex')}));
 const record={id:importId,lessonId:null,rawSource:source,sourceHash,draftRevision:1,status:'VALIDATED',validationHash:sourceHash,validationReport:{issues:[]},audioArtifacts:artifacts};
 const write=vi.fn().mockRejectedValue(new Error('UNAUTHORIZED_PUBLICATION_REACHED'));
 const tx={$executeRaw:vi.fn(),$queryRaw:vi.fn(),mutationReceipt:{findUnique:vi.fn().mockResolvedValue(null)},contentImport:{findUnique:vi.fn().mockResolvedValue(record)},audioArtifact:{findMany:vi.fn().mockResolvedValue(artifacts)},lesson:{findUnique:vi.fn().mockResolvedValue({id:lessonId,slug:parsed.document.lesson!.slug}),upsert:write},missionLesson:{findMany:vi.fn().mockResolvedValue([{mission:{level:{path:{program:{slug:'beginner'}}}}}])}};
 const db={...tx,$transaction:async(fn:(t:unknown)=>unknown)=>fn(tx)};
 const listeningRefs=new Set(parsed.document.activities.filter(a=>a.activityType==='listening').map(a=>a.audioRef));
 const selection=Object.fromEntries(artifacts.filter(a=>listeningRefs.has(a.audioScriptSlug)).map(a=>[a.audioScriptSlug,a.id]));
 await expect(new ContentPublisherService(db as unknown as PrismaService).publish(importId,fixtureActor.id,{expectedDraftRevision:1,expectedSourceHash:sourceHash,idempotencyKey:'unbound-slug',selectedAudioArtifacts:selection})).rejects.toMatchObject({response:{code:'BEGINNER_AUTHORING_DISABLED'}});
 expect(write).not.toHaveBeenCalled();
});

import {syntheticBeginnerSource} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {createBeginnerReview} from '../../beginner/domain/beginner-publication-policy.js';
import {hashBeginnerRecord} from '../../beginner/domain/beginner-environment-preflight.js';
import type {ObjectStorage} from '../../storage/domain/object-storage.port.js';
it('freezes the actual published draft revision with source and snapshot for release evidence',async()=>{
 const source=syntheticBeginnerSource(),sourceHash=createHash('sha256').update(source).digest('hex');
 const importId=randomUUID(),lessonId=randomUUID(),target={...fixtureTarget,lessonId,importId};
 const parsed=parseLessonSource(source),bytes=Buffer.from('synthetic audio bytes');
 const artifacts=parsed.document.audioScripts.map(script=>({id:randomUUID(),contentImportId:importId,audioScriptSlug:script.slug,status:'READY',scriptHash:createHash('sha256').update(audioScriptFingerprintText(script)).digest('hex'),storageKey:'unit/audio.wav',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')}));
 const selection=Object.fromEntries(artifacts.map(a=>[a.audioScriptSlug,a.id]));
 const review=createBeginnerReview({environmentId:fixturePermission().environmentId,target,actorId:randomUUID(),editorId:fixtureActor.id,draftRevision:7,sourceHash,validationHash:sourceHash,normalizedSnapshotHash:hashBeginnerRecord(analyzeLessonSource(source).normalizedDraft),audioSelectionHash:hashBeginnerRecord(selection),selectedAudioArtifacts:selection});
 const record={id:importId,lessonId,rawSource:source,sourceHash,draftRevision:7,status:'VALIDATED',validationHash:sourceHash,validationReport:{issues:[]},audioArtifacts:artifacts,topicGroupRevision:0};
 const create=vi.fn(async({data}:{data:Record<string,unknown>})=>({id:randomUUID(),...data}));
 const audits:Record<string,unknown>[]=[];
 const tx={$executeRaw:vi.fn(),$queryRaw:vi.fn(),mutationReceipt:{findUnique:vi.fn().mockResolvedValue(null),create},contentImport:{findUnique:vi.fn().mockResolvedValue(record),update:create},audioArtifact:{findMany:vi.fn().mockResolvedValue(artifacts)},lesson:{findUniqueOrThrow:vi.fn().mockResolvedValue({id:lessonId,slug:parsed.document.lesson!.slug,currentPublishedVersionId:null,topicGroupId:null}),update:create},lessonVersion:{aggregate:vi.fn().mockResolvedValue({_max:{version:null}}),create,update:create},wordBank:{upsert:vi.fn(async({create:c}:{create:Record<string,unknown>})=>({id:randomUUID(),...c}))},languageBlock:{findUnique:vi.fn().mockResolvedValue(null),upsert:vi.fn(async({create:c}:{create:Record<string,unknown>})=>({id:randomUUID(),...c}))},wordBankVersion:{findFirst:vi.fn().mockResolvedValue(null),aggregate:vi.fn().mockResolvedValue({_max:{version:null}}),create},languageBlockVersion:{create},contentBlock:{create},lessonVersionWordBank:{create},activity:{create},lessonVersionAudioArtifact:{create},auditLog:{findFirst:vi.fn(async({where}:{where:{action:string}})=>where.action==='beginner.review'?{actorId:review.actorId,metadata:review}:{actorId:fixtureActor.id,metadata:{sourceHash}}),create:vi.fn(async({data}:{data:Record<string,unknown>})=>{audits.push(data);return {id:randomUUID(),...data};})}};
 const db={...tx,$transaction:async(fn:(t:unknown)=>unknown)=>fn(tx)};
 const policy=new BeginnerAuthoringPolicy({readPermission:async()=>fixturePermission(),verifyTarget:vi.fn(),verifyEnvironment:vi.fn()});
 const context=await policy.authorize(fixtureActor,'publish',target,db as unknown as Prisma.TransactionClient);
 const result=await new ContentPublisherService(db as unknown as PrismaService,undefined,{read:async()=>bytes} as unknown as ObjectStorage).publish(importId,fixtureActor.id,{expectedDraftRevision:7,expectedSourceHash:sourceHash,idempotencyKey:'publication-evidence',selectedAudioArtifacts:selection},{context,reviewHash:review.reviewHash});
 expect(result.status).toBe('PUBLISHED');
 expect(audits.find(a=>a.action==='PUBLISH_LESSON')?.metadata).toMatchObject({kind:'BEGINNER_PUBLICATION_V1',draftRevision:7,rawSource:source,sourceHash,validationHash:sourceHash,reviewHash:review.reviewHash});
});
