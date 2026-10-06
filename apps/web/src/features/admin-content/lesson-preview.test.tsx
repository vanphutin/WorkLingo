import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ContentPreviewDto } from '@worklingo/contracts';

import { LessonPreview } from './lesson-preview';

afterEach(() => {
  cleanup();
});

const mockPreview: ContentPreviewDto = {
  importId: '11111111-1111-4111-8111-111111111111',
  draftRevision: 2,
  sourceHash: 'hash-abc-123',
  status: 'VALIDATED',
  canPublish: true,
  issues: [],
  normalizedDraft: {
    slug: 'foundation-email-negotiation',
    title: 'Negotiating Project Deadlines via Email',
    level: 'B1',
    durationMinutes: 15,
    objective: 'Learn how to politely negotiate deadlines with international stakeholders.',
    contentBlocks: [
      {
        slug: 'dialogue-1',
        type: 'dialogue',
        text: 'Alex: Could we extend the sprint deadline?\nTaylor: Let us review the critical path.',
      },
    ],
    wordBanks: [
      {
        slug: 'bank-business-terms',
        name: 'Business Negotiation Terms',
        languageBlocks: [
          {
            slug: 'push-back-deadline',
            canonicalForm: 'push back a deadline',
            meaning: 'to postpone or delay a deadline',
            pronunciation: '/pʊʃ bæk ə ˈdɛdlaɪn/',
            collocations: ['politely push back', 'push back by a week'],
            grammarPattern: 'verb + particle + object',
            examples: ['We had to push back the deadline due to unexpected blockers.'],
            commonErrors: ['Do not say: push forward when you mean delay.'],
            cefrLevel: 'B1',
            transferContexts: ['Sprint planning', 'Client meetings'],
          },
        ],
      },
    ],
    activities: [
      {
        slug: 'reading-comp-1',
        order: 1,
        learningBlock: 'readDecode',
        activityType: 'reading',
        skills: ['reading'],
        contentReferences: ['dialogue-1'],
        languageBlockReferences: ['push-back-deadline'],
        payload: {
          prompt: 'Read the dialogue and answer the question below.',
          questions: [
            {
              slug: 'q1',
              prompt: 'Why does Alex want to extend the deadline?',
              options: ['To review critical path', 'Due to workload', 'Sprint is cancelled'],
              answerIndex: 1,
              explanation: 'Alex indicates sprint deliverables require more time.',
              evidence: 'Could we extend the sprint deadline?',
            },
          ],
        },
      },
      {
        slug: 'writing-response-1',
        order: 2,
        learningBlock: 'respond',
        activityType: 'writing',
        skills: ['writing'],
        contentReferences: [],
        languageBlockReferences: ['push-back-deadline'],
        payload: {
          prompt: 'Write an email requesting a deadline extension.',
          sampleAnswer: 'Dear team, I would like to request pushing back our sprint deadline by three days.',
          requiredPhrases: ['push back', 'deadline'],
          minWords: 20,
        },
      },
    ],
    audioScripts: [
      {
        slug: 'audio-dialogue-1',
        speaker: 'Alex and Taylor',
        script: 'Alex: Could we extend the sprint deadline?',
      },
    ],
  },
};

describe('LessonPreview', () => {
  it('renders structured preview with metadata, content blocks, word banks, and activities', () => {
    render(<LessonPreview preview={mockPreview} />);

    // Metadata
    expect(screen.getByText('Negotiating Project Deadlines via Email')).toBeInTheDocument();
    expect(screen.getByText(/foundation-email-negotiation/i)).toBeInTheDocument();
    expect(screen.getByText(/15 minutes/i)).toBeInTheDocument();
    expect(
      screen.getByText('Learn how to politely negotiate deadlines with international stakeholders.'),
    ).toBeInTheDocument();

    // Content Block
    expect(screen.getAllByText(/Alex: Could we extend the sprint deadline/i).length).toBeGreaterThan(0);

    // Word Bank & Language Block
    expect(screen.getByText('Business Negotiation Terms')).toBeInTheDocument();
    expect(screen.getByText('push back a deadline')).toBeInTheDocument();
    expect(screen.getByText('to postpone or delay a deadline')).toBeInTheDocument();
    expect(screen.getByText('/pʊʃ bæk ə ˈdɛdlaɪn/')).toBeInTheDocument();
    expect(screen.getByText(/politely push back/i)).toBeInTheDocument();

    // Activity Comprehension
    expect(screen.getByText(/Why does Alex want to extend the deadline\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Explanation: Alex indicates sprint deliverables/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence: Could we extend the sprint deadline\?/i)).toBeInTheDocument();

    // Activity Response
    expect(screen.getByText('Write an email requesting a deadline extension.')).toBeInTheDocument();
    expect(
      screen.getByText(/Dear team, I would like to request pushing back our sprint deadline/i),
    ).toBeInTheDocument();
  });

  it('escapes authored text and does not render raw HTML', () => {
    const maliciousPreview: ContentPreviewDto = {
      ...mockPreview,
      normalizedDraft: {
        ...mockPreview.normalizedDraft!,
        title: '<img src=x onerror=alert(1)>Malicious Title',
        objective: '<b>Not bold tags</b>',
      },
    };

    const { container } = render(<LessonPreview preview={maliciousPreview} />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>Malicious Title')).toBeInTheDocument();
  });

  it('renders empty preview placeholder when normalizedDraft is null', () => {
    const emptyPreview: ContentPreviewDto = {
      importId: '11111111-1111-4111-8111-111111111111',
      draftRevision: 1,
      sourceHash: 'hash-empty',
      status: 'DRAFT',
      canPublish: false,
      issues: [],
      normalizedDraft: null,
    };

    render(<LessonPreview preview={emptyPreview} />);

    expect(screen.getByText(/no preview available/i)).toBeInTheDocument();
  });
});
