import {describe,it,expect,vi} from 'vitest';
vi.mock('@nestjs/config',()=>({ConfigModule:class{static forRoot(){return {};}}}));
import {shouldIgnoreBeginnerEnvFiles} from './app-config.module.js';
describe('isolated Beginner bootstrap',()=>{
 it('does not restore .env fallback for the explicit isolated test process',()=>{
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'test',WORKLINGO_BEGINNER_ISOLATED_TEST:'1'})).toBe(true);
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'production',WORKLINGO_BEGINNER_ISOLATED_TEST:'1'})).toBe(false);
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'test'})).toBe(false);
 });
 it('ignores env files for explicit controlled main tests only',()=>{
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'test',WORKLINGO_BEGINNER_MAIN_TEST:'1'})).toBe(true);
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'production',WORKLINGO_BEGINNER_MAIN_TEST:'1'})).toBe(false);
  expect(shouldIgnoreBeginnerEnvFiles({NODE_ENV:'test',WORKLINGO_BEGINNER_MAIN_TEST:'0'})).toBe(false);
 });
});
