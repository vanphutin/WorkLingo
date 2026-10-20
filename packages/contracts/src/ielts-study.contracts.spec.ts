import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';

describe('IELTS topic study inputs', () => {
  it.each([90, 120, 150])('accepts authored %i minute sessions', (durationMinutes) => {
    expect(contracts.ieltsStudyDurationSchema.safeParse(durationMinutes).success).toBe(true);
  });
  it.each([45, 60, 91, '90'])('rejects unsupported duration %s', (durationMinutes) => {
    expect(contracts.ieltsStudyDurationSchema.safeParse(durationMinutes).success).toBe(false);
  });
  it('pins a topic version and rejects client policy or curriculum overrides', () => {
    const input = { clientSessionId: crypto.randomUUID(), topicVersionId: crypto.randomUUID(), packSlug: 'education-foundation', durationMinutes: 90 };
    expect(contracts.startIeltsTopicSessionSchema.parse(input)).toEqual(input);
    expect(contracts.startIeltsTopicSessionSchema.safeParse({ ...input, curriculumRevisionId: crypto.randomUUID() }).success).toBe(false);
  });
});
