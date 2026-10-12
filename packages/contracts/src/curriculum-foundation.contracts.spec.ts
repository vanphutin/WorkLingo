import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';

const versionId = '20000000-0000-4000-8000-000000000001';
const valid = {
  category: 'grammar',
  objectives: [{ slug: 'use-present-simple', statement: 'Describe daily work routines.', skills: ['reading'], required: true,
    evidence: [{ lessonVersionId: versionId, activitySlug: 'routine-question', languageBlockSlugs: ['present-simple'] }] }],
  prerequisiteRevisionIds: [],
};

describe('foundation definition contracts', () => {
  // Missing validation would admit unassessable or ambiguous curriculum into publication.
  const schema = () => (contracts as Record<string, unknown>).curriculumDefinitionInputSchema as {
    safeParse: (input: unknown) => { success: boolean };
    parse: (input: unknown) => unknown;
  };
  it('exports the foundation contract and accepts assessable objectives', () => {
    expect(schema()).toBeDefined();
    expect(schema().parse(valid)).toEqual(valid);
  });
  it.each([
    { ...valid, learnerId: versionId },
    { ...valid, category: 'band-nine' },
    { ...valid, objectives: [] },
    { ...valid, objectives: [valid.objectives[0], valid.objectives[0]] },
    { ...valid, objectives: [{ ...valid.objectives[0], evidence: [] }] },
    { ...valid, objectives: [{ ...valid.objectives[0], skills: ['grammar'] }] },
    { ...valid, objectives: [{ ...valid.objectives[0], evidence: [{ ...valid.objectives[0]!.evidence[0], pass: true }] }] },
    { ...valid, prerequisiteRevisionIds: [versionId, versionId] },
    { ...valid, objectives: [{ ...valid.objectives[0], evidence: [valid.objectives[0]!.evidence[0], valid.objectives[0]!.evidence[0]] }] },
  ])('rejects malformed or duplicate definition %#', (input) => {
    expect(schema()).toBeDefined();
    expect(schema().safeParse(input).success).toBe(false);
  });
});
