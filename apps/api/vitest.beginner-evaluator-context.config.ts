import { defineConfig } from 'vitest/config';
import base from './vitest.beginner.config';
export default defineConfig({
    plugins: base.plugins,
    envDir: './test/__no_environment_files__',
    test: { environment: 'node', fileParallelism: false,
        include: ['src/teacher-ai/application/beginner-evaluator-context.spec.ts', 'src/teacher-ai/application/evaluation.service.spec.ts'],
        setupFiles: ['test/beginner-evaluator-context.setup.ts'],
        env: { WL_BEGINNER_EVALUATOR_CONTEXT_TEST: '1', NODE_ENV: 'test', DATABASE_URL: '', TEST_DATABASE_URL: '', OPENAI_API_KEY: '', DISCOVERY_API_KEY: '', MICROSOFT_SPEECH_KEY: '', WL_QUAL_AZURE_KEY: '', WORKLINGO_BEGINNER_ISOLATED_TEST: '1', JOB_WORKER_ENABLED: 'false', WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'fake', WORKLINGO_STT_PROVIDER: 'fake', WORKLINGO_TTS_PROVIDER: 'fake-tts' }
    }
});
