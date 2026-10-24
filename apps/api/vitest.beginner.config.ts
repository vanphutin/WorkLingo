import ts from 'typescript';
import { defineConfig } from 'vitest/config';

// Intentionally independent of vitest.config.ts: no .env or database fallback.
export default defineConfig({
  plugins: [{name:'beginner-decorator-metadata',enforce:'pre',transform(code,id) {
    if (!/\.[cm]?ts$/u.test(id)) return undefined;
    const result=ts.transpileModule(code,{fileName:id,compilerOptions:{emitDecoratorMetadata:true,experimentalDecorators:true,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,sourceMap:true}});
    return {code:result.outputText,map:result.sourceMapText};
  }}],
  test: { environment:'node',fileParallelism:false,
    include:['src/beginner/**/*.spec.ts','src/common/config/app-config.module.spec.ts','src/content-authoring/application/content-imports.service.spec.ts','src/content-authoring/application/content-publisher.service.spec.ts','src/content-authoring/application/audio-generation.service.spec.ts','src/curriculum-foundation/application/foundation-*.spec.ts','src/admin-curriculum/application/admin-curriculum-command.service.spec.ts','src/learning-sessions/domain/*.spec.ts','src/learning-sessions/application/learning-sessions.service.spec.ts'],
    env:{NODE_ENV:'test',DATABASE_URL:'',TEST_DATABASE_URL:'',WORKLINGO_BEGINNER_ISOLATED_TEST:'1',JOB_WORKER_ENABLED:'false',OPENAI_API_KEY:'',MICROSOFT_SPEECH_KEY:'',WORKLINGO_LANGUAGE_EVALUATION_PROVIDER:'fake',WORKLINGO_STT_PROVIDER:'fake',WORKLINGO_TTS_PROVIDER:'fake-tts'}
  }
});
