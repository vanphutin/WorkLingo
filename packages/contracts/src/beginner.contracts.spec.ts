import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';
import { createHash } from 'node:crypto';

const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export function manifestFixture() { return {schemaVersion:1,releaseId:'test-release',hash:'a'.repeat(64),programId:id(1),pathId:id(2),stages:[
  {levelId:id(3),expectedUnitCodes:['mg01','mg02','mg03','mg04'],transitionEnabled:false,units:[
    {missionId:id(4),curriculumRevisionId:id(5),lessons:[{lessonId:id(6),lessonVersionId:id(7),order:0},{lessonId:id(8),lessonVersionId:id(9),order:1}]},
  ]},
]}; }
describe('Beginner manifest contract',()=>{
  it('canonicalizes object keys and excludes only root hash while retaining array order',()=>{
    const input=manifestFixture();
    const a=contracts.hashBeginnerManifest(input);
    expect(a).toMatch(/^[a-f0-9]{64}$/u);
    expect(contracts.hashBeginnerManifest({...input,hash:'b'.repeat(64)})).toBe(a);
    expect(contracts.hashBeginnerManifest({stages:input.stages,pathId:input.pathId,programId:input.programId,releaseId:input.releaseId,schemaVersion:1})).toBe(a);
    const reordered=structuredClone(input);reordered.stages[0]!.units[0]!.lessons.reverse();
    expect(contracts.hashBeginnerManifest(reordered)).not.toBe(a);
  });
  it('validates hash, unique bindings and disabled pilot transitions',()=>{
    const input=manifestFixture();input.hash=contracts.hashBeginnerManifest(input);
    expect(contracts.beginnerManifestSchema.safeParse(input).success).toBe(true);
    expect(contracts.beginnerManifestSchema.safeParse({...input,hash:'f'.repeat(64)}).success).toBe(false);
    const duplicate=structuredClone(input);duplicate.stages[0]!.units[0]!.lessons[1]=duplicate.stages[0]!.units[0]!.lessons[0]!;duplicate.hash=contracts.hashBeginnerManifest(duplicate);
    expect(contracts.beginnerManifestSchema.safeParse(duplicate).success).toBe(false);
    expect(contracts.beginnerManifestSchema.safeParse({...input,stages:[{...input.stages[0],transitionEnabled:true}]}).success).toBe(false);
    expect(contracts.beginnerManifestSchema.safeParse({...input,programId:'not-id'}).success).toBe(false);
  });
});

it('matches independent native SHA256 for a Unicode manifest',()=>{
  const input=manifestFixture(); input.releaseId='bản-thử-nghiệm';
  const canonical = JSON.stringify({pathId:input.pathId,programId:input.programId,releaseId:input.releaseId,schemaVersion:1,stages:[{
    expectedUnitCodes:['mg01','mg02','mg03','mg04'],levelId:id(3),transitionEnabled:false,units:[{curriculumRevisionId:id(5),lessons:[{lessonId:id(6),lessonVersionId:id(7),order:0},{lessonId:id(8),lessonVersionId:id(9),order:1}],missionId:id(4)}],
  }]});
  expect(contracts.hashBeginnerManifest(input)).toBe(createHash('sha256').update(canonical).digest('hex'));
});
