import { Test } from '@nestjs/testing';
import { expect, it } from 'vitest';
import {
  AssessmentHistoryService,
  ASSESSMENT_OPTIONS,
} from './assessment-history.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { LanguageEvaluationPort } from '../../ai-gateway/domain/language-evaluation.port.js';
import { assessmentResultSchema } from '@worklingo/contracts';
it('denies foreign or nonexistent attempts before resolving a provider', async () => {
  const module = await Test.createTestingModule({
    providers: [
      AssessmentHistoryService,
      {
        provide: PrismaService,
        useValue: { activityAttempt: { findFirst: async () => null } },
      },
      { provide: LanguageEvaluationPort, useValue: {} },
      { provide: ASSESSMENT_OPTIONS, useValue: { enabled: false } },
    ],
  }).compile();
  await expect(
    module
      .get(AssessmentHistoryService)
      .requestAssessment('foreign', 'missing', 'key'),
  ).rejects.toThrow('Assessment attempt not found');
});
it('does not count an old score while its superseding evaluation is pending', async () => {
  const attemptId=crypto.randomUUID();
  const result=assessmentResultSchema.parse({schemaVersion:'assessment/1',id:crypto.randomUUID(),submissionId:attemptId,learnerId:crypto.randomUUID(),programVersionId:null,lessonVersionId:crypto.randomUUID(),activityId:crypto.randomUUID(),skill:'reading',rubricId:'r22-reading',rubricVersion:'1',policyVersion:'test/1',promptVersion:'test/1',inputHash:'a'.repeat(64),contextHash:'b'.repeat(64),status:'SCORED',criteria:[{id:'meaning',description:'Meaning',required:true,weight:1,maximumScore:3,rawScore:3,level:3,status:'SCORED',evidenceIds:['s'],rationale:'Submitted evidence.',feedback:'Clear meaning.'}],totalScore:100,maximumScore:100,evidence:[],feedback:'Clear meaning.',confidence:'HIGH',corrections:[],providers:[{role:'objective',name:'objective',model:null,modelFamily:null,requestId:null,inputTokens:null,outputTokens:null,costUsd:0,latencyMs:0,synthetic:false}],previousEvaluationId:null,createdAt:'2026-11-07T00:00:00.000Z',completedAt:'2026-11-07T00:00:01.000Z'});
  const database={evaluationRun:{findMany:async()=>[{attemptId,result:null},{attemptId,result}]}} as unknown as PrismaService;
  const service=new AssessmentHistoryService(database,{} as LanguageEvaluationPort,{enabled:false});
  expect((await service.mastery(result.learnerId)).skills.find(s=>s.skill==='reading')?.observations).toBe(0);
});
