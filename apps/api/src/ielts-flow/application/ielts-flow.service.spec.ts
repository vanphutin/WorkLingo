import { expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { IeltsTopicAdminService } from '../../ielts-study/application/ielts-topic-admin.service.js';
import { IeltsFlowService } from './ielts-flow.service.js';

it('returns the server flag and owner-scoped resumes without fabricating prerequisite evidence',async()=>{
  const db={user:{findUnique:vi.fn().mockResolvedValue({role:'LEARNER',status:'ACTIVE',profile:{onboardingStatus:'COMPLETE'}})},learningProgram:{findUnique:vi.fn().mockResolvedValue({availabilityStatus:'BETA'})},ieltsOrientation:{findUnique:vi.fn().mockResolvedValue(null)},ieltsTopic:{findMany:vi.fn().mockResolvedValue([])},ieltsMockTest:{findMany:vi.fn().mockResolvedValue([])},$queryRaw:vi.fn().mockResolvedValue([{kind:'topic-study',id:'11111111-1111-4111-8111-111111111111',title:'Education',href:'/sessions/11111111-1111-4111-8111-111111111111',updatedAt:new Date(),state:'in-progress'}])};
  Object.assign(db,{$transaction:vi.fn((work:(value:unknown)=>unknown)=>work(db))});
  const service=new IeltsFlowService(db as unknown as PrismaService,new ConfigService({ieltsFlow:'v3'}),{qualify:vi.fn()} as unknown as IeltsTopicAdminService);
  const overview=await service.overview('learner');
  expect(overview.flowVersion).toBe('v3');
  expect(overview.study).toMatchObject({available:false,resumeHref:'/sessions/11111111-1111-4111-8111-111111111111'});
  expect(db.$queryRaw).toHaveBeenCalled();
});
