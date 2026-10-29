import ts from 'typescript';
import {defineConfig} from 'vitest/config';
export default defineConfig({
 envDir: false,
 plugins: [{name:'qualification-decorator-metadata',enforce:'pre',transform(code,id){
  if(!/\.[cm]?ts$/u.test(id))return undefined;
  const result=ts.transpileModule(code,{fileName:id,compilerOptions:{emitDecoratorMetadata:true,experimentalDecorators:true,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,sourceMap:true}});
  return {code:result.outputText,map:result.sourceMapText};
 }},{name:'owned-loopback-only',resolveId(id){if(id.endsWith('virtual:qualification-loopback-guard'))return '\0qualification-loopback-guard';},load(id){if(id!=='\0qualification-loopback-guard')return undefined;return `
 import net from 'node:net';import http from 'node:http';import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';import {vi} from 'vitest';
 const ports=new Set();const listen=http.Server.prototype.listen;const connect=net.Socket.prototype.connect;const originalFetch=globalThis.fetch;const read=fs.readFileSync;
 http.Server.prototype.listen=function(...args){this.once('listening',()=>{const a=this.address();if(a&&a.address==='127.0.0.1'){ports.add(a.port);this.once('close',()=>ports.delete(a.port));}});return Reflect.apply(listen,this,args);};
 net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args;const o=typeof a[0]==='object'?a[0]:{port:a[0],host:a[1]};if(o.host!=='127.0.0.1'||!ports.has(Number(o.port)))throw Error('ISOLATION_NETWORK_DENIED');return Reflect.apply(connect,this,args);};
 globalThis.fetch=(input,init)=>{const u=new URL(String(input));if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!ports.has(Number(u.port)))throw Error('ISOLATION_NETWORK_DENIED');return originalFetch(input,init);};
 fs.readFileSync=function(path,...args){if(/(^|[\\\\/])\\.env(?:\\.[^\\\\/]*)?$/.test(String(path)))throw Error('ISOLATION_ENV_DENIED');return Reflect.apply(read,fs,[path,...args]);};
 vi.spyOn(process,'loadEnvFile').mockImplementation(()=>{throw Error('ISOLATION_ENV_DENIED');});syncBuiltinESMExports();
 `;}}],
 test:{fileParallelism:false,projects:[{extends:true,test:{name:'strict-offline',environment:'node',setupFiles:['test/beginner-evaluator-context.setup.ts'],include:[
 'src/teacher-ai/application/evaluation.service.spec.ts',
 'src/teacher-ai/application/evaluation-processing.spec.ts',
 'src/teacher-ai/application/beginner-evaluator-context.spec.ts',
 'src/teacher-ai/domain/beginner-rubrics.spec.ts',
 'src/teacher-ai/domain/foundation-rubrics.spec.ts',
 'src/teacher-ai/evaluation-harness.spec.ts',
 'src/ai-gateway/infrastructure/routing-language-evaluation.adapter.spec.ts',
 'src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts'
 ]}},{extends:true,test:{name:'owned-loopback-mock',environment:'node',setupFiles:['virtual:qualification-loopback-guard'],include:['src/ai-gateway/infrastructure/openai-language-evaluation.adapter.spec.ts']}}],
 env:{NODE_ENV:'test',DATABASE_URL: '',TEST_DATABASE_URL:'',WL_BEGINNER_EVALUATOR_CONTEXT_TEST:'1',WORKLINGO_BEGINNER_ISOLATED_TEST:'1',JOB_WORKER_ENABLED:'false',OPENAI_API_KEY:'',DISCOVERY_API_KEY:'',MICROSOFT_SPEECH_KEY:'',WL_QUAL_AZURE_KEY:'',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts'}
 }
});
