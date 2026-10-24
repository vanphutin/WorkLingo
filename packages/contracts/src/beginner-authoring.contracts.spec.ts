import { describe,it,expect } from 'vitest';
import * as contract from './beginner-authoring.contracts.ts';
const target={programId:'10000000-0000-4000-8000-000000000001',pathId:'10000000-0000-4000-8000-000000000002',levelId:'10000000-0000-4000-8000-000000000003',missionId:'10000000-0000-4000-8000-000000000004'};
describe('Beginner authoring boundary',()=>{
 it('rejects caller-supplied authority and inconsistent hierarchy',()=>{
  expect(contract.beginnerTargetSchema.safeParse({...target,context:{approved:true}}).success).toBe(false);
  expect(contract.beginnerTargetSchema.safeParse({programId:target.programId,missionId:target.missionId}).success).toBe(false);
  expect(contract.beginnerTargetSchema.safeParse(target).success).toBe(true);
 });
 it('never upgrades fixture content readiness',()=>{
  expect(contract.beginnerReleaseEnvelopeSchema.safeParse({fixtureOnly:true,contentReadiness:'CONTENT_READY'}).success).toBe(false);
 });
});
