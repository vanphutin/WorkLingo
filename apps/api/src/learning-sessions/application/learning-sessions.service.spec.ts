import { activitySchema } from '../../curriculum/domain/curriculum.types.js';
import { beginnerMission } from '../../learning-programs/application/__fixtures__/beginner-r21.js';
import type { ProgramProgressService } from '../../learning-programs/application/program-progress.service.js';
import { describe, expect, it, vi } from 'vitest';
import { foundationMissionFixture } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import type { MasteryService } from '../../mastery/application/mastery.service.js';
import type { JobDispatcher } from '../../jobs/domain/job-dispatcher.port.js';
import { LearningSessionsService } from './learning-sessions.service.js';
import { SessionCreationService } from './session-creation.service.js';
import type { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import type { CurriculumEligibilityService } from '../../curriculum-foundation/application/curriculum-eligibility.service.js';
import type { CurriculumProgressService } from '../../curriculum-foundation/application/curriculum-progress.service.js';

const programProgress = { forEnrollment: async()=>null, assertSessionMutation: async()=>{}, planningOptions: async()=>({}) } as unknown as ProgramProgressService;
const progress = { projectSession: vi.fn() } as unknown as CurriculumProgressService;

describe('LearningSessionsService state transitions', () => {
  it('queues writing evaluation in the attempt transaction before advancing', async () => {
    const learnerId = '00000000-0000-4000-8000-000000000001';
    const sessionId = '00000000-0000-4000-8000-000000000002';
    const writingId = '00000000-0000-4000-8000-000000000005';
    const plan = {
      durationMinutes: 45,
      missionId: '00000000-0000-4000-8000-000000000010',
      lessonVersionId: '00000000-0000-4000-8000-000000000011',
      blocks: [
        { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000003'], skills: ['reading'] },
        { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000004'], skills: ['listening'] },
        { type: 'respond', order: 3, targetMinutes: 15, activityIds: [writingId], skills: ['speaking', 'writing'] },
      ],
    };
    const now = new Date();
    const created = {
      id: '00000000-0000-4000-8000-000000000006', learnerId, sessionId,
      activityId: writingId, clientAttemptId: '00000000-0000-4000-8000-000000000007',
      rawResponse: { text: 'I will follow up with the customer.' }, normalizedResponse: null,
      evaluationStatus: 'SUBMITTED', score: null, feedback: null, createdAt: now, updatedAt: now,
    };
    const evaluated = { ...created, evaluationStatus: 'QUEUED', normalizedResponse: created.rawResponse };
    const transaction = {
      activityAttempt: {
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn().mockResolvedValue(evaluated),
      },
      activityDraft: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      learningSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      sessionBlock: { update: vi.fn().mockResolvedValue({}) },
    };
    const database = {
      lessonVersion: {findUnique: vi.fn(async()=>null)},
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
      activity: { findFirst: vi.fn().mockResolvedValue({
        id: writingId,
        lessonVersionId: plan.lessonVersionId,
        slug: 'write-follow-up',
        order: 2,
        activityType: 'writing',
        learningBlock: 'respond',
        skills: ['writing'],
        contentReferences: ['email-1'],
        languageBlockReferences: ['follow-up'],
        payload: {
          prompt: 'Write a follow-up.', sampleAnswer: 'I will follow up tomorrow.',
          requiredPhrases: ['follow up'], minWords: 5,
        },
      }) },
      learningSession: { findFirst: vi.fn().mockResolvedValue({
        id: sessionId, learnerId, status: 'IN_PROGRESS', currentCheckpoint: 2,
        lessonVersionId: plan.lessonVersionId, planSnapshot: plan, attempts: [], blocks: [],
        mission: { id: plan.missionId, title: 'Workplace follow-up' },
      }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const enqueue = vi.fn().mockResolvedValue({ id: 'evaluation-job' });
    const jobs = { enqueue } as unknown as JobDispatcher;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new LearningSessionsService(
      database, {} as CurriculumService, mastery, {} as SessionCreationService, {} as ProgramContextService,
      {} as CurriculumEligibilityService, progress, programProgress, jobs,
    );

    const result = await service.submitAttempt(learnerId, writingId, {
      clientAttemptId: created.clientAttemptId,
      sessionId,
      response: created.rawResponse,
    });

    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: `evaluate:${created.id}`,
      payload: { attemptId: created.id },
      type: 'EVALUATE_ATTEMPT',
    }), transaction);
    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
    expect(result.evaluationStatus).toBe('queued');
  });

  it.each(['speaking','writing'] as const)('saves pinned Beginner %s as unscored practice with jobs configured', async (skill) => {
    const learnerId = '00000000-0000-4000-8000-000000000001';
    const sessionId = '00000000-0000-4000-8000-000000000002';
    const writingId = '00000000-0000-4000-8000-000000000005';
    const plan = {
      durationMinutes: 45,
      missionId: '00000000-0000-4000-8000-000000000010',
      lessonVersionId: '00000000-0000-4000-8000-000000000011',
      blocks: [
        { type: 'readDecode', order: 1, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000003'], skills: ['reading'] },
        { type: 'listenReason', order: 2, targetMinutes: 15, activityIds: ['00000000-0000-4000-8000-000000000004'], skills: ['listening'] },
        { type: 'respond', order: 3, targetMinutes: 15, activityIds: [writingId], skills: ['speaking', 'writing'] },
      ],
    };
    const now = new Date();
    const created = {
      id: '00000000-0000-4000-8000-000000000006', learnerId, sessionId,
      activityId: writingId, clientAttemptId: '00000000-0000-4000-8000-000000000007',
      rawResponse: { text: 'I will follow up with the customer.' }, normalizedResponse: null,
      evaluationStatus: 'SUBMITTED', score: null, feedback: null, createdAt: now, updatedAt: now,
    };
    const evaluated = { ...created, normalizedResponse: created.rawResponse };
    const update = vi.fn(async ({data}) => ({...evaluated,...data}));
    const transaction = {
      activityAttempt: {
        create: vi.fn().mockResolvedValue(created),
        update,
      },
      activityDraft: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      learningSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      sessionBlock: { update: vi.fn().mockResolvedValue({}) },
    };
    const database = {
      lessonVersion: {findUnique: vi.fn()},
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(null) },
      activity: { findFirst: vi.fn().mockResolvedValue({
        id: writingId,
        lessonVersionId: plan.lessonVersionId,
        slug: 'write-follow-up',
        order: 2,
        activityType: skill,
        learningBlock: 'respond',
        skills: [skill],
        contentReferences: ['email-1'],
        languageBlockReferences: ['follow-up'],
        payload: {
          prompt: 'Write a follow-up.', sampleAnswer: 'I will follow up tomorrow.',
          requiredPhrases: [], minWords: 1, rubricId:skill === 'writing' ? 'beginner-short-writing' : 'beginner-guided-speaking', rubricVersion:'1', ...(skill === 'speaking' ? {mode:'guided_response'} : {}),
        },
      }) },
      learningSession: { findFirst: vi.fn().mockResolvedValue({
        id: sessionId, learnerId, status: 'IN_PROGRESS', currentCheckpoint: 2,
        lessonVersionId: plan.lessonVersionId, planSnapshot: plan, attempts: [], blocks: [],
        mission: { id: plan.missionId, title: 'Workplace follow-up' },
      }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const rawStored = await database.activity.findFirst({where:{id:writingId}});
    const stored = activitySchema.parse(rawStored);
    const pinned = beginnerMission().lessonVersion;
    pinned.activities = pinned.activities.map(a=>a.activityType === skill ? activitySchema.parse({...a,id:writingId,slug:'write-follow-up',payload:stored.payload}) : a);
    pinned.foundation!.activityObjectives['write-follow-up'] = [skill];
    delete pinned.foundation!.activityObjectives[skill+'-'+(skill === 'speaking' ? 6 : 7)];
    vi.mocked(database.lessonVersion.findUnique).mockResolvedValue({parsedContent:pinned} as never);
    const enqueue = vi.fn().mockResolvedValue({ id: 'evaluation-job' });
    const jobs = { enqueue } as unknown as JobDispatcher;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new LearningSessionsService(
      database, {} as CurriculumService, mastery, {} as SessionCreationService, {} as ProgramContextService,
      {} as CurriculumEligibilityService, progress, programProgress, jobs,
    );

    const result = await service.submitAttempt(learnerId, writingId, {
      clientAttemptId: created.clientAttemptId,
      sessionId,
      response: created.rawResponse,
    });

    expect(enqueue).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({evaluationStatus:'SUBMITTED',score:null,feedback:expect.stringContaining('unscored practice')})}));
    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
    expect(result.evaluationStatus).toBe('submitted');
    expect(result.score).toBeNull();
    await expect(service.requireCurrentActivity(learnerId,sessionId,writingId,skill)).rejects.toThrow('BEGINNER_UNSCORED_PRACTICE_REQUIRED');
    vi.mocked(database.lessonVersion.findUnique).mockResolvedValue({parsedContent:{...pinned,formatVersion:'WorkLingoLesson/1.1'}} as never);
    await expect(service.submitAttempt(learnerId,writingId,{clientAttemptId:created.clientAttemptId,sessionId,response:created.rawResponse})).rejects.toThrow('BEGINNER_ACTIVITY_PIN_INVALID');
    expect(transaction.activityAttempt.create).toHaveBeenCalledTimes(1);

  });

  it('does not overwrite a session that completed after a stale pause read', async () => {
    const sessionId = '018f06f6-4f68-7a72-9411-4bf894341234';
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const findFirst = vi.fn()
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'IN_PROGRESS' })
      .mockResolvedValueOnce({ id: sessionId, learnerId, status: 'COMPLETED' });
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const database = { learningSession: { findFirst, updateMany } } as unknown as PrismaService;
    const service = new LearningSessionsService(
      database, {} as CurriculumService, {} as MasteryService, {} as SessionCreationService, {} as ProgramContextService,
      {} as CurriculumEligibilityService, progress, programProgress,
    );

    await expect(service.pauseSession(learnerId, sessionId)).rejects.toMatchObject({
      response: { code: 'INVALID_STATE_TRANSITION' },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: sessionId, learnerId, status: 'IN_PROGRESS' },
      data: { status: 'PAUSED' },
    });
  });

  it('rejects unsupported session durations with 422 and typed code', async () => {
    const service = new LearningSessionsService(
      {} as PrismaService, {} as CurriculumService, {} as MasteryService, {} as SessionCreationService, {} as ProgramContextService,
      {} as CurriculumEligibilityService, progress, programProgress,
    );
    await expect(
      service.createSession('learner-id', 30, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_SESSION_DURATION' },
      status: 422,
    });
  });

  it('passes reviewQueue into planner and handles insufficient content with 422', async () => {
    const learnerId = '018f06f6-4f68-7a72-9411-4bf894345678';
    const database = {
      learningSession: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
      learnerProfile: { findUnique: vi.fn().mockResolvedValue({ currentLevelCode: 'FOUNDATION_1', onboardingStatus: 'COMPLETE' }) },
      $transaction: vi.fn(async (work) => work({
        $queryRaw: vi.fn(),
        learnerProgramEnrollment: { findUnique: vi.fn().mockResolvedValue({ curriculumRevisionIds: [] }) },
        learningSession: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
      })),
    } as unknown as PrismaService;

    // One activity per block, plus separate speaking/writing responses, supports
    // 45/60 minutes but cannot fill the repeated reading/listening blocks at 90.
    const fixture = foundationMissionFixture;
    const activities = [
      ...(['activate', 'readDecode', 'listenReason'] as const).map((type) =>
        fixture.lesson.activities.find((activity) => activity.learningBlock === type)!),
      ...(['speaking', 'writing'] as const).map((skill) =>
        fixture.lesson.activities.find((activity) =>
          activity.learningBlock === 'respond' && activity.skills.some((candidate) => candidate === skill))!),
    ];
    const curriculum = {
      getPublishedMissionsForLevel: vi.fn().mockResolvedValue([{
        id: '00000000-0000-4000-8000-000000000200',
        slug: fixture.slug,
        title: fixture.title,
        objective: fixture.objective,
        levelCode: fixture.level.code,
        lessonVersion: {
          id: '00000000-0000-4000-8000-000000000201',
          version: 1,
          title: fixture.lesson.title,
          contentBlocks: fixture.lesson.contentBlocks.map((b, i) => ({ ...b, id: `00000000-0000-4000-8000-${(i + 1).toString().padStart(12, '0')}` })),
          wordBanks: fixture.lesson.wordBanks.map((wb) => ({
            ...wb,
            id: '00000000-0000-4000-8000-000000000010',
            languageBlocks: wb.languageBlocks.map((lb, i) => ({ ...lb, id: `00000000-0000-4000-8000-${(i + 20).toString().padStart(12, '0')}` })),
          })),
          activities: activities.map((a, i) => ({ ...a, order: i, id: `00000000-0000-4000-8000-${(i + 100).toString().padStart(12, '0')}` })),
        },
      }]),
    } as unknown as CurriculumService;
    const getReviewQueue = vi.fn().mockResolvedValue([]);
    const mastery = { getReviewQueue } as unknown as MasteryService;

    const programContext = { resolve: vi.fn().mockResolvedValue({ levelCode: 'FOUNDATION_1', programId: '10000000-0000-4000-8000-000000000002' }) } as unknown as ProgramContextService;
    const eligibility = { resolve: vi.fn().mockResolvedValue({ revisionId: null, available: true, reasons: [] }) } as unknown as CurriculumEligibilityService;
    const service = new LearningSessionsService(database, curriculum, mastery, new SessionCreationService(), programContext, eligibility, progress, programProgress);

    await expect(
      service.createSession(learnerId, 90, '018f06f6-4f68-7a72-9411-4bf894341234'),
    ).rejects.toMatchObject({
      response: {
        code: 'INSUFFICIENT_CONTENT_FOR_DURATION',
        availableDurations: [45, 60],
      },
      status: 422,
    });
    expect(getReviewQueue).toHaveBeenCalledWith(learnerId,{programId:'10000000-0000-4000-8000-000000000002'});
  });
});

it('returns only phase instructions and redacts hidden Beginner assessment data',async()=>{
  const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const base=foundationMissionFixture.lesson;
  const snapshot={...base,formatVersion:'WorkLingoLesson/1.2',instructions:[{slug:'guide',phase:'respond',order:0,text:'Hãy tự trả lời.'}],foundation:{category:'grammar',templateId:'pilot',templateVersion:1,objectives:[{slug:'task',statement:'Respond',skills:['speaking'],required:true}],activityObjectives:{speak:['task']},responseRubrics:{}},contentBlocks:[{id:id(2),slug:'context',type:'email',text:'Read the context.'}],wordBanks:base.wordBanks.map(b=>({...b,id:id(3),languageBlocks:b.languageBlocks.map(l=>({...l,id:id(4)}))})),activities:[{id:id(5),slug:'speak',activityType:'speaking',learningBlock:'respond',order:0,skills:['speaking'],contentReferences:['context'],languageBlockReferences:[base.wordBanks[0]!.languageBlocks[0]!.slug],payload:{prompt:'Introduce yourself.',sampleAnswer:'SECRET_SAMPLE',audioText:'SECRET_AUDIO_TRANSCRIPT',requiredPhrases:['SECRET_SAMPLE'],minWords:1,mode:'guided_response',rubricId:'beginner-guided-speaking',rubricVersion:'1'}}]};
  const plan={durationMinutes:45,missionId:id(1),lessonVersionId:id(6),blocks:[{type:'readDecode',order:1,targetMinutes:15,activityIds:[id(7)],skills:['reading']},{type:'listenReason',order:2,targetMinutes:15,activityIds:[id(8)],skills:['listening']},{type:'respond',order:3,targetMinutes:15,activityIds:[id(5)],skills:['speaking','writing']}]};
  const db={learningSession:{findFirst:async()=>({id:id(9),learnerId:id(10),planSnapshot:plan,lessonVersionId:id(6)})},lessonVersion:{findUnique:async()=>({parsedContent:snapshot})}} as unknown as PrismaService;
  const service=new LearningSessionsService(db,{} as CurriculumService,{} as MasteryService,{} as SessionCreationService,{} as ProgramContextService,{} as CurriculumEligibilityService,progress,programProgress,{} as JobDispatcher);
  const dto=await service.getActivity(id(10),id(9),id(5));
  expect(dto).toHaveProperty('instructions',[{slug:'guide',phase:'respond',order:0,text:'Hãy tự trả lời.'}]);
  expect(JSON.stringify(dto)).not.toMatch(/SECRET_|sampleAnswer|rubricId|rubricVersion|answerIndex|explanation/);
  expect(dto.payload).toMatchObject({prompt:'Introduce yourself.',mode:'guided_response',minWords:1});
});

it.each(['PLANNED','PAUSED'] as const)('keeps exact V1/C1 during %s after current pointers and supplementary metadata change',async(status)=>{
 const id=(n:number)=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const plan={durationMinutes:45,missionId:id(1),lessonVersionId:id(2),blocks:[{type:'readDecode',order:1,targetMinutes:15,activityIds:[id(3)],skills:['reading']},{type:'listenReason',order:2,targetMinutes:15,activityIds:[id(4)],skills:['listening']},{type:'respond',order:3,targetMinutes:15,activityIds:[id(5)],skills:['speaking','writing']}]};
 const row={id:id(6),learnerId:id(7),clientSessionId:id(8),lessonVersionId:id(2),curriculumRevisionId:id(9),durationMinutes:45,currentCheckpoint:1,planSnapshot:plan,status,attempts:[],blocks:[],updatedAt:new Date(),startedAt:new Date(),mission:{id:id(1),title:'Old Unit',purpose:'LEARNING',slug:'mg01',level:{code:'MG_F0'},currentPublishedRevisionId:id(10),currentPublishedVersionId:id(11),supplementaryReleaseId:'new-metadata-only'}};
 const findFirst=vi.fn(async()=>row),updateMany=vi.fn(async()=>{Object.assign(row,{status:'IN_PROGRESS'});return {count:1};});
 const database={learningSession:{findFirst,updateMany}} as unknown as PrismaService;
 const latest=vi.fn(()=>{throw Error('Unexpected latest resolver');});
 Object.assign(database,{$transaction:async (fn:(tx:unknown)=>unknown)=>fn(database)});
 const service=new LearningSessionsService(database,{getPublishedMission:latest} as unknown as CurriculumService,{} as MasteryService,{} as SessionCreationService,{} as ProgramContextService,{} as CurriculumEligibilityService,progress,programProgress);
 const result=status==='PLANNED'?await service.startSession(id(7),id(6)):await service.resumeSession(id(7),id(6));
 expect(result.lessonVersionId).toBe(id(2));expect(result.curriculumRevisionId).toBe(id(9));expect(result.plan).toEqual(plan);expect(latest).not.toHaveBeenCalled();
});
