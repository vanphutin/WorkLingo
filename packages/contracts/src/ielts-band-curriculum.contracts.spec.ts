import { describe, expect, it } from 'vitest';

import {
  INITIAL_IELTS_BAND_CURRICULUM,
  ieltsBandCurriculumContentSchema,
  ieltsBandPathwaySchema,
  ieltsBandStageCodeSchema,
} from './ielts-band-curriculum.contracts.js';

describe('IELTS band-oriented curriculum contracts', () => {
  it('defines seven ordered stages without treating a target as an estimate', () => {
    expect(ieltsBandStageCodeSchema.options).toEqual([
      'foundation_to_3', 'band_3_to_4', 'band_4_to_5', 'band_5_to_6',
      'band_6_to_7', 'band_7_to_8', 'band_8_to_9',
    ]);
    expect(INITIAL_IELTS_BAND_CURRICULUM.stages).toHaveLength(7);
    expect(INITIAL_IELTS_BAND_CURRICULUM.stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(INITIAL_IELTS_BAND_CURRICULUM.stages[6]?.targetBand).toEqual({ from: 8, to: 9 });
    expect(INITIAL_IELTS_BAND_CURRICULUM).not.toHaveProperty('estimatedBand');
  });

  it('rejects incomplete skills, broken prerequisites and impossible thresholds', () => {
    const content = {
      ...INITIAL_IELTS_BAND_CURRICULUM,
      stages: INITIAL_IELTS_BAND_CURRICULUM.stages.map((stage, index) => {
        if (index === 1) return { ...stage, prerequisiteStageCodes: ['band_8_to_9'] };
        if (index === 2) return { ...stage, competencies: stage.competencies.slice(0, 3) };
        if (index === 3) return { ...stage, exitCriteria: { ...stage.exitCriteria, minimumCorrectRate: 1.2 } };
        return stage;
      }),
    };
    expect(ieltsBandCurriculumContentSchema.safeParse(content).success).toBe(false);
  });

  it('keeps stage, target, proficiency and practice performance as separate learner concepts', () => {
    const pathway = ieltsBandPathwaySchema.parse({
      journeyId: crypto.randomUUID(), curriculumVersionId: crypto.randomUUID(), curriculumVersion: 1,
      currentStageCode: 'foundation_to_3', currentStageTitle: 'Foundation to 3.0', targetBand: 6,
      revision: 1, startedAt: new Date().toISOString(), completedAt: null,
      proficiency: ['listening', 'reading', 'writing', 'speaking'].map((skill) => ({
        skill, descriptor: 'insufficient_evidence', confidence: 'none', sampleCount: 0,
      })),
      practicePerformance: { completedSessions: 0, evaluatedBlocks: 0, recentCorrectRate: null },
      unmetCriteria: [], remediation: [], recommendedPracticeFormats: [], canAdvance: false,
    });
    expect(pathway.targetBand).toBe(6);
    expect(pathway.proficiency[0]?.descriptor).toBe('insufficient_evidence');
    expect(pathway.practicePerformance.recentCorrectRate).toBeNull();
    expect(pathway).not.toHaveProperty('estimatedBand');
    expect(pathway).not.toHaveProperty('officialResult');
  });
});
