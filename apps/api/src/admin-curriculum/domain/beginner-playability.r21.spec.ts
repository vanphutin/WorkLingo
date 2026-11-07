import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { analyzeLessonSource } from '@worklingo/content-format';
import { buildBeginnerDraftSnapshot } from '../../curriculum-foundation/application/foundation-validation.js';
import { assertPlayableMissionLessons } from './curriculum-mutation-policy.js';
describe('official Beginner mission publication playability', () => {
  it('admits the actual complete 45 minute Beginner plan while retaining legacy coverage policy', () => {
    const draft = analyzeLessonSource(readFileSync(path.resolve('../../content/beginner/pilot/mg01-l1.lesson.txt'), 'utf8')).normalizedDraft!;
    const snapshot = buildBeginnerDraftSnapshot(draft);
    expect(() => assertPlayableMissionLessons({ missionStatus: 'PUBLISHED', missionPurpose: 'LEARNING', lessons: [{ id: 'beginner', status: 'PUBLISHED', currentPublishedVersion: { activities: snapshot.activities, parsedContent: snapshot } }] })).not.toThrow();
  });
});
