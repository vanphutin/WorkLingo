import { describe, expect, it } from 'vitest';
import {
  aggregateAssessment,
  projectLearnerAssessment,
} from './assessment-scoring.js';
import { resolveAssessmentRubric } from './assessment-rubrics.js';

const evidence = [
  {
    id: 'answer',
    source: 'submission' as const,
    quote: 'My name is Lucy.',
    start: 0,
    end: 16,
    startMs: null,
    endMs: null,
  },
];
const verdict = (
  skill: 'reading' | 'listening' | 'writing' | 'speaking',
  level = 3,
) => ({
  confidence: 'HIGH' as const,
  summary: 'The response addresses the task.',
  corrections: [],
  criteria: resolveAssessmentRubric(skill).criteria.map((c) => ({
    id: c.id,
    level,
    status: 'SCORED' as const,
    evidenceIds: ['answer'],
    rationale: 'Supported by the submitted response.',
    feedback: 'The meaning is clear.',
  })),
});
describe('evidence-first skill aggregation', () => {
  it('rejects empty quotes beyond the submitted text instead of scoring them', () => {
    expect(() =>
      aggregateAssessment(
        resolveAssessmentRubric('writing'),
        verdict('writing'),
        [{ ...evidence[0]!, quote: '', start: 100, end: 101 }],
        { submission: 'Hello' },
      ),
    ).toThrow('EVIDENCE_INVALID');
  });
  it('issues opaque learner evidence identifiers instead of forwarding provider IDs', () => {
    const privateId = 'PRIVATE ANSWER: Tuesday';
    const projected = projectLearnerAssessment(
      {
        evidence: [{ ...evidence[0]!, id: privateId }],
        criteria: [
          { evidenceIds: [privateId], rationale: 'Observable response.' },
        ],
      },
      ['Tuesday'],
    );
    expect(JSON.stringify(projected)).not.toContain(privateId);
    expect(projected.criteria[0]!.evidenceIds).toEqual([
      projected.evidence[0]!.id,
    ]);
  });
  it('normalizes hand-checked weighted writing levels only after full evidence validation', () => {
    const result = aggregateAssessment(
      resolveAssessmentRubric('writing'),
      verdict('writing', 2),
      evidence,
      { submission: 'My name is Lucy.' },
    );
    expect(result.status).toBe('SCORED');
    expect(result.totalScore).toBe(66.67);
  });
  it('refuses duplicate or unknown criteria instead of silently averaging them', () => {
    const input = verdict('reading');
    input.criteria.push(input.criteria[0]!);
    expect(() =>
      aggregateAssessment(resolveAssessmentRubric('reading'), input, evidence, {
        submission: 'My name is Lucy.',
      }),
    ).toThrow('CRITERION_SET_INVALID');
  });
  it('does not score invented evidence offsets', () => {
    expect(() =>
      aggregateAssessment(
        resolveAssessmentRubric('reading'),
        verdict('reading'),
        [{ ...evidence[0]!, quote: 'Jane' }],
        { submission: 'My name is Lucy.' },
      ),
    ).toThrow('EVIDENCE_INVALID');
  });
  it('never infers acoustic scores from a correct transcript', () => {
    const result = aggregateAssessment(
      resolveAssessmentRubric('speaking'),
      verdict('speaking'),
      evidence,
      { submission: 'My name is Lucy.' },
    );
    expect(result.totalScore).toBeNull();
    expect(result.status).toBe('NOT_SCORABLE');
    expect(result.criteria.find((c) => c.id === 'pronunciation')?.status).toBe(
      'NOT_SCORED',
    );
  });
  it('abstains on low confidence rather than inventing certainty', () => {
    expect(
      aggregateAssessment(
        resolveAssessmentRubric('reading'),
        { ...verdict('reading'), confidence: 'LOW' },
        evidence,
        { submission: 'My name is Lucy.' },
      ).totalScore,
    ).toBeNull();
  });
  it('projects only learner response quotes and no private context evidence', () => {
    const projected = projectLearnerAssessment({
      evidence: [
        ...evidence,
        {
          ...evidence[0]!,
          id: 'private',
          source: 'transcript' as const,
          quote: 'secret key',
        },
      ],
      criteria: [
        { evidenceIds: ['answer', 'private'], rationale: 'secret key' },
      ],
      privateContext: 'secret key',
    });
    expect(JSON.stringify(projected)).not.toContain('secret key');
    expect(projected.evidence).toHaveLength(1);
  });
  it('does not spread unknown internal audit or provider fields into learner responses', () => {
    const projected = projectLearnerAssessment({
      evidence,
      criteria: [],
      audit: { privateTranscript: 'secret transcript' },
      providerRaw: 'private rubric',
    });
    expect(JSON.stringify(projected)).not.toContain('secret transcript');
    expect(JSON.stringify(projected)).not.toContain('private rubric');
  });
  it('never exposes provider-created private answer text through feedback or corrections', () => {
    const result = {
      evidence,
      criteria: [
        {
          id: 'meaning',
          evidenceIds: ['answer'],
          rationale: 'secret key',
          feedback: 'The hidden answer is secret key.',
        },
      ],
      feedback: 'secret key',
      corrections: [
        {
          start: 0,
          end: 2,
          replacement: 'secret key',
          explanation: 'secret key',
        },
      ],
    };
    expect(
      JSON.stringify(projectLearnerAssessment(result, ['secret key'])),
    ).not.toContain('secret key');
  });
  it('never forwards untrusted audio quotes or private provider prose to learners', () => {
    const result = {
      evidence: [
        {
          id: 'audio',
          source: 'audio' as const,
          quote: 'hidden excerpt',
          start: null,
          end: null,
          startMs: 0,
          endMs: 10,
        },
      ],
      criteria: [
        {
          id: 'meaning',
          evidenceIds: ['audio'],
          rationale: 'hidden excerpt',
          feedback: 'The hidden key is 12.',
        },
      ],
      feedback: 'Private rubric fragment',
      corrections: [
        {
          start: 0,
          end: 2,
          replacement: '12',
          explanation: 'Private instruction',
        },
      ],
    };
    const serialized = JSON.stringify(
      projectLearnerAssessment(result, [
        'long secret not matching the excerpt',
      ]),
    );
    for (const secret of [
      'hidden excerpt',
      'hidden key',
      'Private rubric',
      'Private instruction',
      '"replacement":"12"',
    ])
      expect(serialized).not.toContain(secret);
  });
});
