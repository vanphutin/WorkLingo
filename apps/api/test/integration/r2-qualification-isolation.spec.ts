import { describe, expect, it } from 'vitest';
import { requireR2QualificationDatabase } from './r2-qualification-database.js';

const owned = 'postgresql://fixture:disposable@127.0.0.1:55447/worklingo_r2';
describe('R2 qualification database isolation', () => {
  it.each([
    'postgresql://fixture:disposable@127.0.0.1:55432/worklingo_r2',
    'postgresql://fixture:disposable@localhost:55447/worklingo_r2',
    'postgresql://fixture:disposable@remote.invalid:55447/worklingo_r2',
    'postgresql://fixture:disposable@127.0.0.1:55447/primary',
    'https://127.0.0.1:55447/worklingo_r2',
  ])('rejects a mismatched endpoint before migration: %s', testUrl => {
    expect(() => requireR2QualificationDatabase(owned, testUrl)).toThrow('Owned disposable R2 endpoint required');
  });
  it('allows only the owned endpoint with a per-suite schema', () => {
    expect(() => requireR2QualificationDatabase(owned, `${owned}?schema=r2_unique_schema`)).not.toThrow();
  });
});
