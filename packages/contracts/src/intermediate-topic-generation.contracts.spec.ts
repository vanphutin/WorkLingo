import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';
const request = { topicGroupId: '00000000-0000-4000-8000-000000000001', durationMinutes: 90, provider: 'openai', level: 'B1', difficulty: 'medium' };
describe('Intermediate generation request boundary', () => {
  it('accepts the explicit provider and duration without introducing automatic routing', () => {
    expect(contracts.generateIntermediateTopicRequestSchema.parse(request)).toEqual(request);
  });
  it.each([{ provider: 'automatic' }, { durationMinutes: 75 }, { topicGroupId: 'free-text-topic' }, { level: 'C1' }, { difficulty: 'expert' }, { secret: 'not-allowed' }])('rejects unsupported input %j', patch => {
    expect(contracts.generateIntermediateTopicRequestSchema.safeParse({ ...request, ...patch }).success).toBe(false);
  });
});
