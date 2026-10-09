import { describe, expect, it } from 'vitest';

import type { PublishedMission } from './curriculum.types.js';
import { findPlayableLevels } from './playable-level-policy.js';

const id = (value: number): string =>
  `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;

function mission(purpose: PublishedMission['purpose'] = 'learning'): PublishedMission {
  return {
    id: id(1),
    lessonVersion: {
      activities: [
        { activityType: 'writing', contentReferences: ['message'], id: id(10), languageBlockReferences: ['follow-up'], learningBlock: 'activate', order: 0, payload: { minWords: 2, prompt: 'Write.', requiredPhrases: ['follow up'], sampleAnswer: 'Follow up.' }, skills: ['writing'], slug: 'activate-message' },
        { activityType: 'reading', contentReferences: ['message'], id: id(11), languageBlockReferences: ['follow-up'], learningBlock: 'readDecode', order: 1, payload: { prompt: 'Read.', questions: [{ answerIndex: 0, evidence: 'Follow up today.', explanation: 'The time is explicit.', options: ['Today', 'Tomorrow'], prompt: 'When?', slug: 'when' }] }, skills: ['reading'], slug: 'read-message' },
        { activityType: 'listening', contentReferences: ['call'], id: id(12), languageBlockReferences: ['follow-up'], learningBlock: 'listenReason', order: 2, payload: { prompt: 'Listen.', questions: [{ answerIndex: 1, evidence: 'Call the customer.', explanation: 'The action is explicit.', options: ['Email', 'Call'], prompt: 'How?', slug: 'how' }] }, skills: ['listening'], slug: 'listen-call' },
        { activityType: 'speaking', contentReferences: ['call'], id: id(13), languageBlockReferences: ['follow-up'], learningBlock: 'respond', order: 3, payload: { minWords: 3, mode: 'shadowing', prompt: 'Respond.', requiredPhrases: ['follow up'], sampleAnswer: 'I will follow up.' }, skills: ['speaking'], slug: 'speak-response' },
        { activityType: 'writing', contentReferences: ['message'], id: id(14), languageBlockReferences: ['follow-up'], learningBlock: 'respond', order: 4, payload: { minWords: 3, prompt: 'Reply.', requiredPhrases: ['follow up'], sampleAnswer: 'I will follow up.' }, skills: ['writing'], slug: 'write-response' },
      ],
      contentBlocks: [],
      id: id(2),
      title: 'Playable mission',
      version: 1,
      wordBanks: [],
    },
    levelCode: 'FOUNDATION_1',
    objective: 'Handle a workplace follow-up.',
    purpose,
    slug: `mission-${purpose}`,
    title: 'Playable mission',
  };
}

describe('findPlayableLevels', () => {
  it('marks a level available only from a normal 60-minute four-skill mission', () => {
    expect(findPlayableLevels({
      levels: [{
        cefrReference: 'Pre-A1',
        code: 'FOUNDATION_1',
        missions: [mission('placement'), mission('learning')],
        name: 'Foundation 1',
      }],
    })).toEqual([{
      available: true,
      cefrReference: 'Pre-A1',
      code: 'FOUNDATION_1',
      name: 'Foundation 1',
      reason: 'A published 60-minute four-skill learning mission is available.',
    }]);
  });

  it('does not let a placement mission make a level playable', () => {
    expect(findPlayableLevels({
      levels: [{
        cefrReference: 'Pre-A1', code: 'FOUNDATION_1',
        missions: [mission('placement')], name: 'Foundation 1',
      }],
    })[0]).toMatchObject({ available: false, reason: 'No published learning mission is available.' });
  });

  it('marks a level unavailable when one skill is missing', () => {
    const incomplete = mission();
    incomplete.lessonVersion.activities = incomplete.lessonVersion.activities
      .filter((activity) => activity.activityType !== 'speaking');

    expect(findPlayableLevels({
      levels: [{
        cefrReference: 'Pre-A1', code: 'FOUNDATION_1',
        missions: [incomplete], name: 'Foundation 1',
      }],
    })[0]).toMatchObject({
      available: false,
      reason: 'Published learning content cannot form a canonical 60-minute four-skill session.',
    });
  });

  it('marks a level unavailable when canonical 60-minute blocks cannot be formed', () => {
    const unplannable = mission();
    unplannable.lessonVersion.activities = unplannable.lessonVersion.activities
      .filter((activity) => activity.learningBlock !== 'activate');

    expect(findPlayableLevels({
      levels: [{
        cefrReference: 'Pre-A1', code: 'FOUNDATION_1',
        missions: [unplannable], name: 'Foundation 1',
      }],
    })[0]).toMatchObject({
      available: false,
      reason: 'Published learning content cannot form a canonical 60-minute four-skill session.',
    });
  });
});
