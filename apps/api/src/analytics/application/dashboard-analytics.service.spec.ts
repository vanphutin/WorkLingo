import {describe,it,expect,vi} from 'vitest';
import type {PrismaService} from '../../common/database/prisma.service.js';
import type {ProgramContextService} from '../../learning-programs/application/program-context.service.js';
import {DashboardAnalyticsService} from './dashboard-analytics.service.js';
import {defaultProgramPolicy} from '../../learning-programs/application/program-release-snapshot.js';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
describe('dashboard published Beginner access',()=>{
 it('keeps published Beginner Beta visible and never serializes release proof',async()=>{
  const snapshot={title:'Beginner',description:'Practice',objectives:['Practice'],estimatedMinutes:45,difficulty:'A0',policy:defaultProgramPolicy,curriculumBindings:[{curriculumRevisionId:id(2),pathId:id(3),levelId:id(4),missionId:id(5),order:1,title:'Unit',objectives:['Practice'],required:true,prerequisiteRevisionIds:[],lessons:[{lessonVersionId:id(6),order:1,title:'Lesson',objectives:['Practice'],estimatedMinutes:45,difficulty:'A0',activityIds:[id(7)],vocabularyRefs:[],resourceRefs:[]}]}]};
  const row={id:id(1),slug:'beginner',name:'Beginner',availabilityStatus:'BETA',enrolled:false,active:false,currentLevelCode:null,totalMissions:2,completedMissions:0,totalLessons:8,completedLessons:0};
  const release={status:'PUBLISHED',source:'AUTHORED',snapshot,curriculumRevisionIds:[id(2)]};
  const tx={user:{findUnique:async()=>({displayName:'Learner',profile:{onboardingStatus:'PENDING'}})},learningProgram:{findMany:vi.fn(async()=>[{id:row.id,progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:[id(2)],versions:[release]}])},$queryRaw:vi.fn(async(query:{strings:string[]})=>query.strings.join('').includes('AS enrolled')?[row]:[])};
  const service=new DashboardAnalyticsService({$transaction:async(work:(tx:unknown)=>unknown)=>work(tx)} as unknown as PrismaService,{} as ProgramContextService);
  const result=await service.learner(id(9));
  expect(result.programs[0]!.availabilityStatus).toBe('BETA');
  expect(JSON.stringify(result)).not.toMatch(/curriculumRevisionIds|progressionPolicy|snapshot|curriculumBindings/);
  release.status='APPROVED';
  expect((await service.learner(id(9))).programs[0]!.availabilityStatus).toBe('COMING_SOON');
 });
});
