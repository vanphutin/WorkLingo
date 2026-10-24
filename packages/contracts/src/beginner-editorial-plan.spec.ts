import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {beginnerEditorialPlan} from './beginner-editorial-plan.ts';
describe('editorial curriculum is a plan, never content',()=>{
 it('preserves all 80 authored planning rows and prerequisites from the design',()=>{
  const map=readFileSync(new URL('../../../docs/superpowers/specs/2026-10-24-beginner-knowledge-map.md',import.meta.url),'utf8');
  const sourceCodes=[...map.matchAll(/^\| ((?:MG|CB)\d{2}-L[1-4]) /gm)].map(m=>m[1]);
  const units=beginnerEditorialPlan.stages.flatMap(s=>s.units);
  expect(beginnerEditorialPlan.stages).toHaveLength(5);expect(units).toHaveLength(20);
  expect(units.flatMap(u=>u.lessons.map(l=>l.code))).toEqual(sourceCodes);
  for(const lesson of units.flatMap(u=>u.lessons)){
   expect(lesson.status).toBe('PLANNED');expect(lesson.grammar).not.toBe('');expect(lesson.objective).not.toBe('');expect(lesson.prerequisite).not.toBe('');
   expect(lesson).not.toHaveProperty('lessonVersionId');expect(lesson).not.toHaveProperty('resourceId');
  }
 });
 it('keeps video slots metadata-only and reuses their original content codes',()=>{
  const slots=beginnerEditorialPlan.videoSlots;expect(slots).toHaveLength(55);
  expect(new Set(slots.map(s=>s.code)).size).toBe(55);
  expect(slots.every(s=>s.production==='NOT_STARTED' && !('assetUrl' in s))).toBe(true);
 });
});
