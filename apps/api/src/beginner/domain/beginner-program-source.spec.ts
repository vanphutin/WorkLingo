import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { reconcileBeginnerSources } from './beginner-program-source.js';

const root = path.resolve('../..');
describe('R2.1 exact Beginner source admission', () => {
  it('reconciles all source bindings using committed LF identities and exact selected audio', async () => {
    const result = await reconcileBeginnerSources(root);
    expect(result.counts).toEqual({ lessons: 8, activities: 64, objectives: 32, lexicalBlocks: 41, scripts: 24 });
    expect(result.lessons[0]?.sourceHash).toBe('da7a962a6f49c5a37a8e6abf94f57d320095749807aee7b8087bbcea7e6834a7');
    expect(result.lessons[5]?.bundleHash).toBe('06db374a3a4289630fd11ef8bc9cb170ed285525b94c2965d6d91b2f031cf193');
    expect(result.lessons.flatMap(lesson => lesson.audio)).toHaveLength(24);
  });
  it('rejects a changed source rather than inheriting its old bundle qualification', async () => {
    await expect(reconcileBeginnerSources(root, file => file.endsWith('mg01-l1.lesson.txt') ? readFileSync(file, 'utf8') + '\n# changed\n' : readFileSync(file, 'utf8'))).rejects.toThrow('BEGINNER_SOURCE_CHANGED');
  });
});
