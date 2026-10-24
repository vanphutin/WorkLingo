import { createHash } from 'node:crypto';
import { foundationMissionFixture } from '@worklingo/test-fixtures';

import type { PrismaService } from '../../common/database/prisma.service.js';
import type { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import type { MasteryService } from '../../mastery/application/mastery.service.js';
import type { CurriculumProgressService } from '../../curriculum-foundation/application/curriculum-progress.service.js';
import { describe, expect, it, vi } from 'vitest';

import { EvaluationService } from './evaluation.service.js';

const progress = { projectSession: vi.fn() } as unknown as CurriculumProgressService;

const writingAttempt = {
  id: '00000000-0000-4000-8000-000000000001',
  learnerId: '00000000-0000-4000-8000-000000000002',
  rawResponse: { text: 'I will follow up with the customer before Friday.' },
  activity: {
    activityType: 'writing',
    contentReferences: ['email-1'],
    id: '00000000-0000-4000-8000-000000000003',
    languageBlockReferences: ['follow-up'],
    learningBlock: 'respond',
    order: 1,
    payload: {
      minWords: 5,
      prompt: 'Write a short workplace follow-up.',
      requiredPhrases: ['follow up'],
      sampleAnswer: 'I will follow up with the customer before Friday.',
    },
    skills: ['writing'],
    slug: 'write-follow-up',
  },
  evaluationResults: [],
  recording: null,
  session: {
    lessonVersionId: '00000000-0000-4000-8000-000000000004',
    mission: { level: { code: 'FOUNDATION_1' }, purpose: 'LEARNING' },
  },
} as const;

const languageResult = {
  feedback: {
    correctedExample: 'I will follow up with the customer before Friday.',
    improvements: ['Add a clear next step.'],
    strengths: ['The response is direct.'],
    summary: 'The workplace response is clear.',
  },
  scores: {
    clarity: 0.8,
    meaningAndLogic: 0.8,
    targetLanguage: 0.9,
    taskCompletion: 0.8,
  },
} as const;

describe('EvaluationService', () => {
  it('shows the running speech job while language evaluation is still waiting', async () => {
    const database = { activityAttempt: { findFirst: async () => ({ id: writingAttempt.id, evaluationStatus: 'QUEUED', score: null, evaluationResults: [],
      recording: { id: writingAttempt.id, transcript: null, providerName: null, deletedAt: null, retentionUntil: null } }) },
      job: { findMany: async () => [{ type: 'TRANSCRIBE_SPEECH', status: 'RUNNING' }] },
    } as unknown as PrismaService;
    const service = new EvaluationService(database, {} as LanguageEvaluationPort, {} as MasteryService, { recordingRetentionDays: 7 }, progress);
    const response = await service.getForLearner(writingAttempt.learnerId, writingAttempt.id);
    expect(response).toHaveProperty('processingSteps', [
      { key: 'submission', status: 'completed', providerName: null, model: null },
      { key: 'transcription', status: 'processing', providerName: null, model: null },
      { key: 'evaluation', status: 'waiting', providerName: null, model: null },
    ]);
  });
  it('returns recorded model provenance for completed feedback without exposing provider configuration', async () => {
    const database = { activityAttempt: { findFirst: async () => ({ id: writingAttempt.id, evaluationStatus: 'EVALUATED', score: .8,
      recording: null, evaluationResults: [{ completedAt: new Date('2026-10-19T00:00:00Z'), feedback: languageResult.feedback, scores: { ...languageResult.scores, pronunciationOrFluency: null }, score: .8,
        providerName: 'discovery', providerModel: 'qwen3.8-27b', providerConfigVersion: 'private-config' }] }) } } as unknown as PrismaService;
    const service = new EvaluationService(database, {} as LanguageEvaluationPort, {} as MasteryService, { recordingRetentionDays: 7, languageProviderModel: 'different-configured-model' }, progress);
    const response = await service.getForLearner(writingAttempt.learnerId, writingAttempt.id);
    expect(response).toHaveProperty('processingSteps', [
      { key: 'submission', status: 'completed', providerName: null, model: null },
      { key: 'evaluation', status: 'completed', providerName: 'discovery', model: 'qwen3.8-27b' },
    ]);
    expect(JSON.stringify(response)).not.toMatch(/private-config|different-configured-model/);
  });
  it('persists actual routed provenance with scores and uses the attempt owner for routing', async () => {
    let persisted: Record<string, unknown> | undefined;
    const transaction = {
      evaluationResult: { findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { persisted = data; return { id: 'routed-result', score: data.score }; } },
      activityAttempt: { update: async () => ({}) },
    };
    const database = { activityAttempt: { findUnique: async () => writingAttempt }, $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(transaction) } as unknown as PrismaService;
    const language = { evaluateWithProvenance: async (input: { routing?: { userId?: string } }) => {
      expect(input.routing?.userId).toBe(writingAttempt.learnerId);
      return { evaluation: languageResult, provenance: { providerName: 'discovery', providerModel: 'qwen3.8-27b', providerConfigVersion: 'routing-test' } };
    } } as unknown as LanguageEvaluationPort;
    const mastery = { recordAttemptEvaluation: async () => [] } as unknown as MasteryService;
    await new EvaluationService(database, language, mastery, { recordingRetentionDays: 7, languageProviderName: 'openai-compatible', languageProviderModel: 'configured-but-unused' }, progress).evaluateAttempt(writingAttempt.id);
    expect(persisted).toMatchObject({ providerName: 'discovery', providerModel: 'qwen3.8-27b', providerConfigVersion: 'routing-test', score: expect.closeTo(0.825) });
  });
  it('returns only learner-safe evaluation state and retry metadata', async () => {
    const completedAt = new Date('2026-10-08T00:00:00Z');
    const database = {
      activityAttempt: { findFirst: vi.fn().mockResolvedValue({
        id: writingAttempt.id,
        evaluationStatus: 'EVALUATED',
        score: 0.825,
        evaluationResults: [{
          completedAt,
          feedback: languageResult.feedback,
          score: 0.825,
          scores: { ...languageResult.scores, pronunciationOrFluency: null },
        }],
        recording: null,
      }) },
      job: { findFirst: vi.fn() },
    } as unknown as PrismaService;
    const service = new EvaluationService(
      database, {} as LanguageEvaluationPort, {} as MasteryService, { recordingRetentionDays: 7 }, progress,
    );

    await expect(service.getForLearner(writingAttempt.learnerId, writingAttempt.id)).resolves.toEqual({
      attemptId: writingAttempt.id,
      completedAt: completedAt.toISOString(),
      processingSteps: [
        { key: 'submission', status: 'completed', providerName: null, model: null },
        { key: 'evaluation', status: 'completed', providerName: null, model: null },
      ],
      feedback: languageResult.feedback,
      recording: null,
      retryable: false,
      score: 0.825,
      scores: { ...languageResult.scores, pronunciationOrFluency: null },
      status: 'evaluated',
      transcript: null,
    });
    expect(database.job.findFirst).not.toHaveBeenCalled();
  });

  it('persists one immutable result and records mastery in the same transaction', async () => {
    const createResult = vi.fn().mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000005', score: 0.825,
    });
    const transaction = {
      activityAttempt: { update: vi.fn().mockResolvedValue({}) },
      evaluationResult: { create: createResult, findUnique: vi.fn().mockResolvedValue(null) },
      recording: { update: vi.fn() },
    };
    const database = {
      activityAttempt: { findUnique: vi.fn().mockResolvedValue(writingAttempt) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const language = { evaluate: vi.fn().mockResolvedValue(languageResult) } as unknown as LanguageEvaluationPort;
    const mastery = { recordAttemptEvaluation: vi.fn().mockResolvedValue([]) } as unknown as MasteryService;
    const service = new EvaluationService(database, language, mastery, { recordingRetentionDays: 7 }, progress);

    const result = await service.evaluateAttempt(writingAttempt.id);

    expect(language.evaluate).toHaveBeenCalledWith(expect.objectContaining({
      activityType: 'writing',
      learnerResponse: writingAttempt.rawResponse.text,
      levelCode: 'FOUNDATION_1',
      prompt: writingAttempt.activity.payload.prompt,
      referenceText: writingAttempt.activity.payload.sampleAnswer,
      requiredPhrases: writingAttempt.activity.payload.requiredPhrases,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
    }));
    expect(createResult).toHaveBeenCalledWith({ data: expect.objectContaining({
      attemptId: writingAttempt.id,
      lessonVersionId: writingAttempt.session.lessonVersionId,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
      score: expect.closeTo(0.825),
    }) });
    expect(mastery.recordAttemptEvaluation).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: writingAttempt.id,
      evaluationStatus: 'EVALUATED',
      languageBlockSlugs: ['follow-up'],
      score: expect.closeTo(0.825),
      tx: transaction,
    }));
    expect(result).toMatchObject({
      id: '00000000-0000-4000-8000-000000000005', score: expect.closeTo(0.825),
    });
  });

  it('returns an existing result without calling the provider or mastery again', async () => {
    const existing = { id: 'existing-result', score: 0.7 };
    const inputHash = createHash('sha256').update(JSON.stringify({
      activityId: writingAttempt.activity.id,
      learnerResponse: writingAttempt.rawResponse.text,
      lessonVersionId: writingAttempt.session.lessonVersionId,
      rubricId: 'foundation-workplace-writing',
      rubricVersion: '1',
      speechMetrics: null,
    })).digest('hex');
    const database = {
      activityAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          ...writingAttempt,
          evaluationResults: [{ ...existing, inputHash, rubricVersion: '1' }],
        }),
      },
    } as unknown as PrismaService;
    const language = { evaluate: vi.fn() } as unknown as LanguageEvaluationPort;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new EvaluationService(database, language, mastery, { recordingRetentionDays: 7 }, progress);

    await expect(service.evaluateAttempt(writingAttempt.id)).resolves.toEqual(existing);
    expect(language.evaluate).not.toHaveBeenCalled();
    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
  });

  it('persists placement evaluation without writing learning mastery', async () => {
    const transaction = {
      activityAttempt: { update: vi.fn().mockResolvedValue({}) },
      evaluationResult: {
        create: vi.fn().mockResolvedValue({ id: 'placement-result', score: 0.825 }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      recording: { update: vi.fn() },
    };
    const database = {
      activityAttempt: { findUnique: vi.fn().mockResolvedValue({
        ...writingAttempt,
        session: { ...writingAttempt.session, mission: { ...writingAttempt.session.mission, purpose: 'PLACEMENT' } },
      }) },
      $transaction: vi.fn(async (work) => work(transaction)),
    } as unknown as PrismaService;
    const mastery = { recordAttemptEvaluation: vi.fn() } as unknown as MasteryService;
    const service = new EvaluationService(
      database,
      { evaluate: vi.fn().mockResolvedValue(languageResult) } as unknown as LanguageEvaluationPort,
      mastery,
      { recordingRetentionDays: 7 },
      progress,
    );

    await service.evaluateAttempt(writingAttempt.id);

    expect(mastery.recordAttemptEvaluation).not.toHaveBeenCalled();
  });
});

function beginnerAttempt(skill:'speaking'|'writing'='writing') {
  const base=foundationMissionFixture.lesson;
  const rubricId=skill==='speaking'?'beginner-guided-speaking':'beginner-short-writing';
  const activity={...writingAttempt.activity,activityType:skill,skills:[skill],payload:{...writingAttempt.activity.payload,prompt:String(writingAttempt.activity.payload.prompt),requiredPhrases:[],sampleAnswer:'Hidden model answer',rubricId,rubricVersion:'1',...(skill==='speaking'?{mode:'guided_response'}:{})}};
  const snapshot={...base,formatVersion:'WorkLingoLesson/1.2',foundation:{category:'grammar',templateId:'pilot',templateVersion:1,objectives:[{slug:'task',statement:'Respond',skills:[skill],required:true}],activityObjectives:{[activity.slug]:['task']} as Record<string,string[]>,responseRubrics:{}},activities:[activity],contentBlocks:[{id:writingAttempt.id,slug:'email-1',type:'email',text:'Context'}],wordBanks:base.wordBanks.map(b=>({...b,id:writingAttempt.id,languageBlocks:b.languageBlocks.map(l=>({...l,id:writingAttempt.id,slug:'follow-up'}))}))};
  return {...writingAttempt,activity,recording:skill==='speaking'?{id:'recording',transcript:'I am Binh.',speechMetrics:null}:null,session:{...writingAttempt.session,lessonVersion:{id:writingAttempt.session.lessonVersionId,parsedContent:snapshot},mission:{level:{code:'MG_F0',path:{program:{slug:'beginner'}}},purpose:'LEARNING'}}};
}
describe('Beginner exact rubric dispatch',()=>{
  it.each(['writing','speaking'] as const)('uses pinned1.2 rubric for %s and does not require shadowing metrics',async(skill)=>{
    const attempt=beginnerAttempt(skill);let stored:Record<string,unknown>|undefined;
    const transaction={evaluationResult:{findUnique:async()=>null,create:async({data}:{data:Record<string,unknown>})=>{stored=data;return {id:'result',score:data.score};}},activityAttempt:{update:async()=>({})},recording:{update:async()=>({})}};
    const database={activityAttempt:{findUnique:async()=>attempt},$transaction:async(fn:(tx:unknown)=>unknown)=>fn(transaction)} as unknown as PrismaService;
    const evaluate=vi.fn(async()=>languageResult);const language={evaluate} as unknown as LanguageEvaluationPort;
    await new EvaluationService(database,language,{recordAttemptEvaluation:async()=>[]} as unknown as MasteryService,{recordingRetentionDays:7},progress).evaluateAttempt(attempt.id);
    expect(stored).toMatchObject({rubricId:skill==='speaking'?'beginner-guided-speaking':'beginner-short-writing',rubricVersion:'1',lessonVersionId:attempt.session.lessonVersionId,score:expect.closeTo(.82),scores:{pronunciationOrFluency:null}});
    expect(evaluate).toHaveBeenCalledWith(expect.objectContaining({requiredPhrases:[],referenceText:''}));
  });
  it.each(['unknown-version','wrong-program','missing-snapshot','changed-activity','conflicting-result','duplicate-id','unmapped-objective'] as const)('rejects %s before provider and mutation',async(kind)=>{
    const attempt=beginnerAttempt();
    if(kind==='unknown-version') attempt.activity.payload.rubricVersion='2';
    if(kind==='duplicate-id') attempt.session.lessonVersion.parsedContent.activities.push({...attempt.activity,payload:{...attempt.activity.payload,prompt:'Conflicting duplicate'}});
    if(kind==='unmapped-objective') attempt.session.lessonVersion.parsedContent.foundation.activityObjectives={};
    if(kind==='wrong-program') attempt.session.mission.level.path.program.slug='intermediate';
    if(kind==='missing-snapshot') attempt.session.lessonVersion.parsedContent.formatVersion='';
    if(kind==='changed-activity') attempt.activity={...attempt.activity,payload:{...attempt.activity.payload,prompt:'Changed task'}};
    const existing=kind==='conflicting-result'?[{id:'old',rubricId:'foundation-workplace-writing',rubricVersion:'1',inputHash:'old',score:1}]:[];
    const evaluate=vi.fn();const mutate=vi.fn();
    const database={activityAttempt:{findUnique:async()=>({...attempt,evaluationResults:existing})},$transaction:mutate} as unknown as PrismaService;
    await expect(new EvaluationService(database,{evaluate} as unknown as LanguageEvaluationPort,{} as MasteryService,{recordingRetentionDays:7},progress).evaluateAttempt(attempt.id)).rejects.toThrow();
    expect(evaluate).not.toHaveBeenCalled();expect(mutate).not.toHaveBeenCalled();
  });
});

it('keeps unsupported exact Beginner rubric version error before any provider or writes',async()=>{
  const attempt=beginnerAttempt();attempt.activity.payload.rubricVersion='2';
  const evaluate=vi.fn(),mutate=vi.fn();
  const db={activityAttempt:{findUnique:async()=>attempt},$transaction:mutate} as unknown as PrismaService;
  await expect(new EvaluationService(db,{evaluate} as unknown as LanguageEvaluationPort,{} as MasteryService,{recordingRetentionDays:7},progress).evaluateAttempt(attempt.id)).rejects.toThrow('RUBRIC_VERSION_UNSUPPORTED');
  expect(evaluate).not.toHaveBeenCalled();expect(mutate).not.toHaveBeenCalled();
});
