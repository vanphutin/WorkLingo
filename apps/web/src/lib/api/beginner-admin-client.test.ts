import {describe,it,expect,vi,afterEach} from 'vitest';
import {beginnerEditorialPlan} from '@worklingo/contracts';
import {BeginnerAdminClient} from './beginner-admin-client';
afterEach(()=>vi.unstubAllGlobals());
describe('scoped Beginner client',()=>{
 it('uses the Beginner endpoint rather than generic curriculum authoring',async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({plan:beginnerEditorialPlan,paths:[],bindings:[],writesEnabled:false,actions:[],environmentId:null})});vi.stubGlobal('fetch',fetcher);
  const value=await new BeginnerAdminClient().workspace();
  expect(fetcher).toHaveBeenCalledWith('/api/v1/admin/beginner',expect.objectContaining({credentials:'include'}));
  expect(value.writesEnabled).toBe(false);
 });
});
