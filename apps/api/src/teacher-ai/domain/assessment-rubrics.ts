import type { AssessmentSkill } from '@worklingo/contracts';
export interface AssessmentRubricCriterion {
  readonly id: string;
  readonly description: string;
  readonly weight: number;
  readonly required: boolean;
  readonly acoustic?: boolean;
}
export interface AssessmentRubric {
  readonly id: string;
  readonly version: string;
  readonly skill: AssessmentSkill;
  readonly criteria: readonly AssessmentRubricCriterion[];
}
const criterion = (
  id: string,
  description: string,
  weight = 1,
  acoustic = false,
): AssessmentRubricCriterion => ({
  id,
  description,
  weight,
  required: true,
  ...(acoustic ? { acoustic: true } : {}),
});
export function resolveAssessmentRubric(
  skill: AssessmentSkill,
): AssessmentRubric {
  const meaning = criterion(
    'meaning',
    'Meaning and factual accuracy against the exact source; accept valid paraphrases.',
    3,
  );
  const relevance = criterion(
    'task',
    'Task completion, required facts and relevant objectives; no reward for length.',
    3,
  );
  const grammar = criterion(
    'grammar',
    'Grammar appropriate to the taught CEFR objectives; accept contractions and valid alternatives.',
  );
  const vocabulary = criterion(
    'vocabulary',
    'Appropriate and accurate vocabulary for the learner level.',
  );
  const criteria =
    skill === 'reading' || skill === 'listening'
      ? [
          meaning,
          relevance,
          criterion(
            'evidence',
            'Source-supported understanding, details and inference; grammar is not assessed.',
            2,
          ),
        ]
      : skill === 'writing'
        ? [
            relevance,
            meaning,
            grammar,
            vocabulary,
            criterion('sentences', 'Sentence construction.'),
            criterion('coherence', 'Organization and coherence.'),
            criterion('mechanics', 'Spelling and mechanics.'),
            criterion(
              'level',
              'CEFR-appropriate use; do not require untaught advanced forms.',
            ),
          ]
        : [
            relevance,
            meaning,
            grammar,
            vocabulary,
            criterion(
              'pronunciation',
              'Acoustic phoneme/word accuracy with source timestamps.',
              2,
              true,
            ),
            criterion(
              'intelligibility',
              'Acoustic intelligibility evidence; transcription alone is insufficient.',
              2,
              true,
            ),
            criterion(
              'fluency',
              'Acoustic timing, pauses and fluency.',
              2,
              true,
            ),
            criterion('communication', 'Relevant and effective communication.'),
          ];
  return { id: `r22-${skill}`, version: '1', skill, criteria };
}
