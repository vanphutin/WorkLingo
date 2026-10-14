interface AnswerPolicy { readonly acceptedAnswers: readonly string[]; readonly caseSensitive: boolean; readonly maxWords: number | null }

const normalize = (value: string, caseSensitive: boolean): string => {
  const compact = value.trim().replace(/\s+/gu, ' ');
  return caseSensitive ? compact : compact.toLocaleLowerCase('en');
};

const wordCount = (value: string): number => value.trim() ? value.trim().split(/\s+/u).length : 0;
const halfBand = (value: number): number => Math.round(value * 2) / 2;

export function scoreObjectiveAnswer(answer: string, policy: AnswerPolicy): boolean {
  if (policy.maxWords !== null && wordCount(answer) > policy.maxWords) return false;
  const candidate = normalize(answer, policy.caseSensitive);
  return policy.acceptedAnswers.some((accepted) => normalize(accepted, policy.caseSensitive) === candidate);
}

export function scoreProductiveSkills(input: {
  readonly writingTask1: readonly [number, number, number, number];
  readonly writingTask2: readonly [number, number, number, number];
  readonly speaking: readonly [number, number, number, number];
}): { writing: number; speaking: number } {
  const average = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return { writing: halfBand((average(input.writingTask1) + average(input.writingTask2) * 2) / 3), speaking: halfBand(average(input.speaking)) };
}

export function toOverallMockBand(skillBands: readonly [number, number, number, number]): number {
  return halfBand(skillBands.reduce((sum, value) => sum + value, 0) / skillBands.length);
}
