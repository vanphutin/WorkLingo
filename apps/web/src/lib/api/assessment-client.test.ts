import { afterEach,it,expect,vi } from 'vitest';
import { AssessmentClient } from './assessment-client';
afterEach(()=>vi.unstubAllGlobals());
it('fails closed on malformed history rather than rendering unvalidated scores',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({items:[{totalScore:101}]}))));
 await expect(new AssessmentClient().history('attempt')).rejects.toThrow();
});
it('retains HTTP authorization failure status',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:403})));
 await expect(new AssessmentClient().history('attempt',true)).rejects.toMatchObject({status:403});
});
it('reuses an unresolved request key after a network failure to avoid duplicate runs',async()=>{
 const bodies:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{bodies.push(String(options.body));throw new Error('connection lost');}));
 const client=new AssessmentClient();
 await expect(client.evaluate('attempt')).rejects.toThrow();
 await expect(client.evaluate('attempt')).rejects.toThrow();
 expect(JSON.parse(bodies[0]!).idempotencyKey).toBe(JSON.parse(bodies[1]!).idempotencyKey);
});
