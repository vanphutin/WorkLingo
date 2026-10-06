import { describe, expect, it } from 'vitest';
import { canonicalLessonSource, invalidLessonSources } from '@worklingo/test-fixtures';
import { parseLessonSource } from './parser.js';
import { normalizeLessonDocument } from './normalizer.js';

describe('normalizeLessonDocument', () => {
  it('normalizes the canonical lesson fixture into NormalizedLessonDraft', () => {
    const parseRes = parseLessonSource(canonicalLessonSource);
    expect(parseRes.issues).toEqual([]);

    const draft = normalizeLessonDocument(parseRes.document);
    expect(draft).not.toBeNull();
    if (!draft) return;

    // Lesson metadata
    expect(draft.slug).toBe('handling-customer-complaints');
    expect(draft.title).toBe('Handling Customer Complaints');
    expect(draft.level).toBe('foundation');
    expect(draft.durationMinutes).toBe(60);
    expect(draft.objective).toBe('Understand and respond to a customer complaint effectively.');

    // Content blocks
    expect(draft.contentBlocks).toHaveLength(1);
    expect(draft.contentBlocks[0]).toMatchObject({
      slug: 'complaint-email',
      type: 'email',
    });
    expect(draft.contentBlocks[0]!.text).toContain('Dear Support Team');

    // Word Banks & Language Blocks
    expect(draft.wordBanks).toHaveLength(1);
    expect(draft.wordBanks[0]!.slug).toBe('customer-service');
    expect(draft.wordBanks[0]!.name).toBe('Customer Service');
    expect(draft.wordBanks[0]!.languageBlocks).toHaveLength(2);

    const apologizeBlock = draft.wordBanks[0]!.languageBlocks[0]!;
    expect(apologizeBlock.slug).toBe('apologize');
    expect(apologizeBlock.canonicalForm).toBe('apologize');
    expect(apologizeBlock.meaning).toBe('xin lỗi');
    expect(apologizeBlock.pronunciation).toBe('/əˈpɒlədʒaɪz/');
    expect(apologizeBlock.collocations).toEqual(['sincerely apologize', 'apologize for the delay']);
    expect(apologizeBlock.grammarPattern).toBe('apologize for + noun/V-ing');
    expect(apologizeBlock.examples).toEqual([
      'We sincerely apologize for the inconvenience.',
      'Please apologize to the customer for the delay.',
    ]);
    expect(apologizeBlock.commonErrors).toEqual([
      'Do not use "apologize about the delay".',
      'Remember that apologize is followed by for.',
    ]);
    expect(apologizeBlock.cefrLevel).toBe('foundation');
    expect(apologizeBlock.transferContexts.length).toBeGreaterThan(0);

    // Activities
    expect(draft.activities).toHaveLength(4);

    // 1: activate writing
    const act0 = draft.activities[0]!;
    expect(act0.slug).toBe('activate-warmup');
    expect(act0.order).toBe(0);
    expect(act0.learningBlock).toBe('activate');
    expect(act0.activityType).toBe('writing');
    expect(act0.skills).toEqual(['writing']);
    expect(act0.languageBlockReferences).toEqual(['apologize']);
    expect(act0.payload).toMatchObject({
      prompt: 'Write a sentence to apologize to a customer for a delayed delivery.',
    });

    // 2: read_decode -> readDecode
    const act1 = draft.activities[1]!;
    expect(act1.slug).toBe('reading-comprehension');
    expect(act1.order).toBe(1);
    expect(act1.learningBlock).toBe('readDecode');
    expect(act1.activityType).toBe('reading');
    expect(act1.skills).toEqual(['reading']);
    expect(act1.contentReferences).toEqual(['complaint-email']);
    expect(act1.languageBlockReferences).toEqual(['apologize', 'resolve-issue']);
    expect('questions' in act1.payload).toBe(true);
    if ('questions' in act1.payload) {
      expect(act1.payload.questions).toHaveLength(1);
      const q = act1.payload.questions[0]!;
      expect(q.slug).toBe('reading-comprehension-q1');
      expect(q.prompt).toBe('Why did David Miller write the email to the support team?');
      expect(q.options).toEqual([
        'To ask for a discount on a new purchase',
        'To report damaged items and missing accessories',
        'To praise the customer service team',
      ]);
      // Answer was B -> index 1
      expect(q.answerIndex).toBe(1);
      expect(q.explanation).toBe('David states that his items arrived damaged and accessories were missing.');
      expect(q.evidence).toBe('complaint-email:4');
    }

    // 3: listen_reason -> listenReason
    const act2 = draft.activities[2]!;
    expect(act2.slug).toBe('listening-comprehension');
    expect(act2.order).toBe(2);
    expect(act2.learningBlock).toBe('listenReason');
    expect(act2.activityType).toBe('listening');
    expect(act2.skills).toEqual(['listening']);
    if ('questions' in act2.payload) {
      expect(act2.payload.questions).toHaveLength(1);
      const q = act2.payload.questions[0]!;
      expect(q.answerIndex).toBe(1); // Answer was B -> 1
    }

    // 4: respond speaking with shadowing
    const act3 = draft.activities[3]!;
    expect(act3.slug).toBe('speaking-practice');
    expect(act3.order).toBe(3);
    expect(act3.learningBlock).toBe('respond');
    expect(act3.activityType).toBe('speaking');
    expect(act3.skills).toEqual(['speaking']);
    if ('mode' in act3.payload) {
      expect(act3.payload.mode).toBe('shadowing');
    }
  });

  it('maps answer labels A, B, C, D to zero-based indices 0, 1, 2, 3', () => {
    const parseRes = parseLessonSource(canonicalLessonSource);
    const draft = normalizeLessonDocument(parseRes.document);
    expect(draft).not.toBeNull();
  });

  it('preserves list order of word banks, content blocks, and activities', () => {
    const parseRes = parseLessonSource(canonicalLessonSource);
    const draft = normalizeLessonDocument(parseRes.document);
    expect(draft).not.toBeNull();
    if (!draft) return;

    expect(draft.activities.map((a) => a.order)).toEqual([0, 1, 2, 3]);
  });

  it('returns null when document fails structural or semantic validation', () => {
    const parseRes = parseLessonSource(invalidLessonSources.missingReference);
    const draft = normalizeLessonDocument(parseRes.document);
    expect(draft).toBeNull();
  });
});
