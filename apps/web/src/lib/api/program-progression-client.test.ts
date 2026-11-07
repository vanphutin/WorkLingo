import {afterEach,expect,it,vi} from 'vitest';
import {LearningProgramClient} from './learning-program-client';
afterEach(()=>vi.unstubAllGlobals());
const metadata={name:'Workplace',description:'Useful English',learningGoal:'Handle requests',proficiencyLabel:'A2',iconKey:'intermediate' as const,displayOrder:5};
const id='11111111-1111-4111-8111-111111111111';
const program={...metadata,id,slug:'workplace-new',revision:1,progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:[],availabilityStatus:'IN_DEVELOPMENT'};
it('validates admin requests and strictly parses responses on credentialed create/update/publish/list routes',async()=>{
 const fetcher=vi.fn().mockImplementation(async()=>Response.json(program));vi.stubGlobal('fetch',fetcher);const client=new LearningProgramClient('/api/v1');
 await client.createProgram({...metadata,slug:'workplace-new',idempotencyKey:'create-1'});
 expect(fetcher).toHaveBeenLastCalledWith('/api/v1/admin/learning-programs',expect.objectContaining({method:'POST',credentials:'include'}));
 await client.updateProgram(id,{...metadata,expectedRevision:1,idempotencyKey:'update-1'});
 expect(fetcher).toHaveBeenLastCalledWith(`/api/v1/admin/learning-programs/${id}`,expect.objectContaining({method:'PUT'}));
 await client.publishProgram(id,{curriculumRevisionIds:['22222222-2222-4222-8222-222222222222'],expectedRevision:1,idempotencyKey:'publish-1'});
 expect(fetcher).toHaveBeenLastCalledWith(`/api/v1/admin/learning-programs/${id}/publish`,expect.objectContaining({method:'POST'}));
 fetcher.mockResolvedValue(Response.json({programs:[program]}));expect((await client.listPrograms()).programs).toHaveLength(1);
 fetcher.mockResolvedValue(Response.json({...program,privateData:'unexpected'}));await expect(client.createProgram({...metadata,slug:'workplace-new',idempotencyKey:'create-1'})).rejects.toThrow();
 const before=fetcher.mock.calls.length;await expect(client.publishProgram(id,{curriculumRevisionIds:[],expectedRevision:1,idempotencyKey:'p'})).rejects.toThrow();expect(fetcher.mock.calls).toHaveLength(before);
});
it('validates enroll input before a POST and returns server context only',async()=>{
 const fetcher=vi.fn().mockImplementation(async()=>Response.json({activeProgram:null,enrollment:null}));vi.stubGlobal('fetch',fetcher);const client=new LearningProgramClient('/api/v1');
 await client.enrollProgram({programSlug:'workplace-new',expectedRevision:3});expect(fetcher).toHaveBeenCalledWith('/api/v1/me/program-enrollments',expect.objectContaining({method:'POST',body:JSON.stringify({programSlug:'workplace-new',expectedRevision:3})}));
 expect(await client.enrollProgram({programSlug:'beginner',expectedRevision:3})).toEqual({activeProgram:null,enrollment:null});expect(fetcher).toHaveBeenLastCalledWith('/api/v1/me/program-enrollments',expect.objectContaining({method:'POST',body:JSON.stringify({programSlug:'beginner',expectedRevision:3})}));
 await expect(client.enrollProgram({programSlug:'toeic',expectedRevision:3})).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(2);
});
