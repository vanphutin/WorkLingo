import { afterEach, expect, it, vi } from 'vitest';
import { ProgramPlatformClient } from './program-platform-client';
const id='11111111-1111-4111-8111-111111111111';
afterEach(()=>vi.unstubAllGlobals());
it('validates paging and uses exact owned enrollment progress route with credentials', async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[],total:0,page:2,limit:25})));
 vi.stubGlobal('fetch',fetch);
 const client=new ProgramPlatformClient();
 expect(await client.enrollmentsMine({page:2,limit:25})).toEqual({items:[],total:0,page:2,limit:25});
 expect(fetch).toHaveBeenCalledWith('/api/v1/me/program-enrollments?page=2&limit=25',expect.objectContaining({credentials:'include'}));
 await expect(client.progress('bad')).rejects.toThrow();
 await expect(client.versions(id,{page:0,limit:25})).rejects.toThrow();
});
it('rejects malformed server responses and preserves structured API errors',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[],total:0,page:1,limit:25,unexpected:1}))));
 await expect(new ProgramPlatformClient().versions(id)).rejects.toThrow();
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:'PROGRAM_VERSION_REVISION_STALE',message:'Changed'}}),{status:409})));
 await expect(new ProgramPlatformClient().preview(id,id)).rejects.toMatchObject({code:'PROGRAM_VERSION_REVISION_STALE',status:409});
});
