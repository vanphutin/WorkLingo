import { describe, expect, it } from 'vitest';
import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { contextSignatures, selectMissionForReview } from './context-transfer.js';

const id = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
function mission(n: number, text: string): PublishedMission {
  const source = foundationMissionFixture;
  return {
    id: id(n), slug: `mission-${n}`, title: 'Workplace mission', objective: 'Use language at work',
    levelCode: 'FOUNDATION_1',
    lessonVersion: { ...lessonSnapshotSchema.parse({
      ...source.lesson,
      contentBlocks: source.lesson.contentBlocks.map((c, i) => ({ ...c, id: id(n + i + 20), text })),
      wordBanks: source.lesson.wordBanks.map((b) => ({ ...b, id: id(10),
        languageBlocks: b.languageBlocks.map((l, i) => ({ ...l, id: id(30 + i) })),
      })),
      activities: source.lesson.activities.map((a, i) => ({ ...a, id: id(n + i + 100), order: i })),
    }), id: id(n + 10), version: 1 },
  };
}

describe('context transfer mission selection', () => {
  it('prioritizes a new document context for the due stable block and skill', () => {
    const old = mission(200, 'Please ask Mai for help.');
    const next = mission(400, 'A customer asks An for help with an order.');
    const activity = old.lessonVersion.activities[1]!;
    expect(selectMissionForReview([old, next], [{
      id: id(900), languageBlockId: id(33), skill: 'reading',
      previousContextSignatures: contextSignatures(old, activity),
    }], []).id).toBe(id(400));
  });

  it('does not call a slug/version rename of identical text a new context', () => {
    const old = mission(200, 'Please ask Mai for help.');
    const base = mission(400, '  Please   ask Mai for help.  ');
    const renamed = { ...base, lessonVersion: { ...base.lessonVersion, version: 2 } };
    const next = mission(600, 'Please help a customer complete the order.');
    const activity = old.lessonVersion.activities[1]!;
    expect(selectMissionForReview([renamed, next], [{
      id: id(900), languageBlockId: id(33), skill: 'reading',
      previousContextSignatures: contextSignatures(old, activity),
    }], []).id).toBe(id(600));
  });

  it('does not match an unrelated skill even when block IDs match', () => {
    const old = mission(200, 'Old document');
    const next = mission(400, 'New document');
    next.lessonVersion.activities = next.lessonVersion.activities.filter((a) => a.activityType !== 'reading');
    expect(selectMissionForReview([old, next], [{
      id: id(900), languageBlockId: id(33), skill: 'reading',
      previousContextSignatures: contextSignatures(old, old.lessonVersion.activities[1]!),
    }], []).id).toBe(id(200));
  });

  it('prefers unfinished curriculum when no transfer content exists', () => {
    const old = mission(200, 'Same document');
    const next = mission(400, 'Same document');
    expect(selectMissionForReview([old, next], [], [old.id]).id).toBe(next.id);
  });

  it('keeps a same-context review available when no alternative exists', () => {
    const old = mission(200, 'Only document');
    expect(selectMissionForReview([old], [{
      id: id(900), languageBlockId: id(33), skill: 'reading',
      previousContextSignatures: contextSignatures(old, old.lessonVersion.activities[1]!),
    }], [old.id]).id).toBe(old.id);
  });

  it('keeps the scheduler highest priority item ahead of a lower-priority transfer', () => {
    const old = mission(200, 'Old document');
    const next = mission(400, 'New document');
    next.lessonVersion.activities = next.lessonVersion.activities.map((activity) =>
      activity.activityType === 'reading' ? { ...activity, languageBlockReferences: ['i-work-in'] } : activity);
    const prior = contextSignatures(old, old.lessonVersion.activities[1]!);
    expect(selectMissionForReview([old, next], [
      { id: id(900), languageBlockId: id(33), skill: 'reading', previousContextSignatures: prior },
      { id: id(901), languageBlockId: id(31), skill: 'reading', previousContextSignatures: prior },
    ], []).id).toBe(old.id);
  });
});
