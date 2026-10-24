import {describe,it,expect} from 'vitest';
import {fixturePermission} from '../../../test/fixtures/beginner/authoring/fixture-factory.js';
import {validateBeginnerPermission,preflightBeginnerEnvironment} from './beginner-environment-preflight.js';
describe('Beginner fail-closed environment',()=>{
 it('rejects missing, modified and expired permission records',()=>{
  expect(()=>validateBeginnerPermission(null)).toThrow();
  const p=fixturePermission();p.actions.push('cleanup');expect(()=>validateBeginnerPermission(p)).toThrow('BEGINNER_PERMISSION_HASH_MISMATCH');
  expect(()=>validateBeginnerPermission(fixturePermission(),Date.parse('2100-01-01'))).toThrow('BEGINNER_PERMISSION_EXPIRED');
 });
 it('rejects production/fallback URLs and role mismatch before filesystem inspection',()=>{
  const p=fixturePermission();
  for(const url of ['', 'postgresql://root@127.0.0.1/worklingo','postgresql://wl_beginner_abcdef123456@production.example/worklingo_beginner_r12a_abcdef123456'])
   expect(()=>preflightBeginnerEnvironment(p,url)).toThrow();
 });
});
