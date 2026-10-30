import {defineConfig} from 'vitest/config';
import base from './qualification-vitest.config';

// Independent no-env unit/contract run; default integration configuration is never imported.
export default defineConfig({
 envDir:false,
 plugins:[...(base.plugins??[]),{name:'controller-owned-loopback',resolveId(id){if(id.endsWith('virtual:controller-loopback-guard'))return '\0controller-loopback-guard';},load(id){if(id!=='\0controller-loopback-guard')return undefined;return `
 import http from 'node:http';import net from 'node:net';import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';import {vi} from 'vitest';
 const listen=http.Server.prototype.listen,connect=net.Socket.prototype.connect,read=fs.readFileSync;
 const servers=new Set();
 http.Server.prototype.listen=function(...args){servers.add(this);this.once('close',()=>servers.delete(this));return Reflect.apply(listen,this,args);};
 net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args;const o=typeof a[0]==='object'?a[0]:{port:a[0],host:a[1]};if(!['127.0.0.1','::1'].includes(o.host)||![...servers].some(server=>{const address=server.address();return address&&typeof address==='object'&&['127.0.0.1','::1','::','0.0.0.0'].includes(address.address)&&address.port===Number(o.port);}))throw Error('ISOLATION_NETWORK_DENIED');return Reflect.apply(connect,this,args);};
 globalThis.fetch=()=>{throw Error('ISOLATION_NETWORK_DENIED');};
 fs.readFileSync=function(path,...args){if(/(^|[\\\\/])\\.env(?:\\.[^\\\\/]*)?$/.test(String(path)))throw Error('ISOLATION_ENV_DENIED');return Reflect.apply(read,fs,[path,...args]);};
 vi.spyOn(process,'loadEnvFile').mockImplementation(()=>{throw Error('ISOLATION_ENV_DENIED');});
 vi.mock('@prisma/client',async(original)=>({...await original(),PrismaClient:class{constructor(){throw Error('ISOLATION_PRISMA_DENIED');}}}));syncBuiltinESMExports();
 `;}}],
 test:{fileParallelism:false,projects:[{extends:true,test:{name:'autonomous-offline',environment:'node',setupFiles:['test/beginner-evaluator-context.setup.ts'],include:[
  'src/beginner/**/*.spec.ts',
  'src/curriculum-foundation/**/*.spec.ts',
  'src/learning-sessions/**/*.spec.ts',
  'src/teacher-ai/**/*.spec.ts',
  'src/admin-content-lifecycle/**/*.spec.ts',
  'src/common/logging/**/*.spec.ts',
  'src/common/http/**/*.spec.ts',
  'src/audit/**/*.spec.ts',
  'src/auth/infrastructure/roles.guard.spec.ts',
  'src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts',
  'src/ai-gateway/infrastructure/routing-language-evaluation.adapter.spec.ts',
  'src/ai-gateway/infrastructure/fake-provider-contract.spec.ts',
  'src/content-authoring/application/content-imports.service.spec.ts',
  'src/content-authoring/application/content-publisher.service.spec.ts'
 ],exclude:['src/beginner/beginner-admin.controller.spec.ts']}},{extends:true,test:{name:'owned-loopback-mock',environment:'node',setupFiles:['virtual:qualification-loopback-guard'],include:['src/ai-gateway/infrastructure/openai-language-evaluation.adapter.spec.ts']}},{extends:true,test:{name:'controller-loopback-mock',environment:'node',setupFiles:['virtual:controller-loopback-guard'],include:['src/beginner/beginner-admin.controller.spec.ts']}}],
 env:{NODE_ENV:'test',DATABASE_URL:'',TEST_DATABASE_URL:'',WL_BEGINNER_EVALUATOR_CONTEXT_TEST:'1',WORKLINGO_BEGINNER_ISOLATED_TEST:'1',JOB_WORKER_ENABLED:'false',OPENAI_API_KEY:'',DISCOVERY_API_KEY:'',MICROSOFT_SPEECH_KEY:'',WL_QUAL_AZURE_KEY:'',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts'}
 }
});
