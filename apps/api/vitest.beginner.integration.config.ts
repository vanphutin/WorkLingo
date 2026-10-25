import {defineConfig} from 'vitest/config';
import unit from './vitest.beginner.config';
import {requireBeginnerTestEnvironment,sanitizedBeginnerChildEnvironment} from './test/integration/beginner-test-harness';
// Deliberately never import the default integration config or root .env.
const permission=requireBeginnerTestEnvironment();
export default defineConfig({plugins:unit.plugins,test:{environment:'node',fileParallelism:false,include:['test/integration/beginner-authoring.integration.spec.ts','test/integration/beginner-release-registry.integration.spec.ts'],env:sanitizedBeginnerChildEnvironment(permission,process.env.TEST_DATABASE_URL!),testTimeout:30000,hookTimeout:30000}});
