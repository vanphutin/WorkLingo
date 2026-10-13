import { describe, expect, it } from 'vitest';

import {
  orientationContentSchema,
  orientationLearnerPresentationSchema,
  orientationProgressUpdateSchema,
} from './ielts-orientation.contracts.ts';

const slide = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'welcome-to-ielts',
  title: 'Welcome to IELTS',
  body: 'Understand the test before learning its strategies.',
  transcript: 'Welcome. This short orientation explains how IELTS works.',
  imageAssetId: null,
  audioAssetId: null,
  question: null,
};

describe('IELTS orientation contracts', () => {
  it('accepts a bounded presentation with stable slides and a valid knowledge check', () => {
    const content = orientationContentSchema.parse({
      title: 'IELTS Orientation',
      description: 'A guided introduction to the IELTS pathway.',
      slides: [
        slide,
        { ...slide, id: '22222222-2222-4222-8222-222222222222', slug: 'four-skills', title: 'Four skills' },
        {
          ...slide,
          id: '33333333-3333-4333-8333-333333333333',
          slug: 'check-your-understanding',
          title: 'Check your understanding',
          question: {
            slug: 'skills-check',
            prompt: 'Which skills does IELTS assess?',
            options: ['Reading only', 'All four language skills'],
            answerIndex: 1,
            explanation: 'IELTS assesses Listening, Reading, Writing and Speaking.',
          },
        },
      ],
    });

    expect(content.slides).toHaveLength(3);
  });

  it.each([
    ['duplicate slide slugs', [slide, { ...slide, id: '22222222-2222-4222-8222-222222222222' }, { ...slide, id: '33333333-3333-4333-8333-333333333333' }]],
    ['an answer outside the option range', [slide, { ...slide, id: '22222222-2222-4222-8222-222222222222', slug: 'second' }, { ...slide, id: '33333333-3333-4333-8333-333333333333', slug: 'third', question: { slug: 'bad-answer', prompt: 'Choose.', options: ['A', 'B'], answerIndex: 2, explanation: 'No.' } }]],
  ])('rejects %s', (_case, slides) => {
    expect(() => orientationContentSchema.parse({ title: 'IELTS Orientation', description: 'Introduction.', slides })).toThrow();
  });

  it('keeps learner presentation payloads free of answer keys', () => {
    const learner = orientationLearnerPresentationSchema.parse({
      id: '44444444-4444-4444-8444-444444444444',
      orientationId: '55555555-5555-4555-8555-555555555555',
      title: 'IELTS Orientation',
      version: 1,
      slides: [{ ...slide, question: { slug: 'safe-check', prompt: 'Choose.', options: ['A', 'B'] } }],
    });

    expect(learner.slides[0]?.question).not.toHaveProperty('answerIndex');
  });

  it('requires version and optimistic revision on every progress write', () => {
    expect(() => orientationProgressUpdateSchema.parse({ targetSlideIndex: 1 })).toThrow();
    expect(orientationProgressUpdateSchema.parse({
      orientationVersionId: '44444444-4444-4444-8444-444444444444',
      expectedRevision: 2,
      targetSlideIndex: 1,
    }).expectedRevision).toBe(2);
  });
});
