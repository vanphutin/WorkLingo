import { describe, expect, it } from 'vitest';
import { resolveMockModePolicy } from './mock-mode-policy.js';
describe('Pinned mock mode policy', () => {
  it('gives V3 practice an elapsed clock, pause and section feedback', () => {
    expect(resolveMockModePolicy('PRACTICE', 'v2')).toEqual({ timerMode: 'elapsed', canPause: true, feedbackRelease: 'section', audioPlayLimit: null });
  });
  it('keeps simulation timed and single-play with full-test feedback', () => {
    expect(resolveMockModePolicy('EXAM_SIMULATION', 'v2')).toEqual({ timerMode: 'deadline', canPause: false, feedbackRelease: 'test', audioPlayLimit: 1 });
  });
  it('preserves old Learning/Practice deadlines and rejects Learning for new attempts', () => {
    expect(resolveMockModePolicy('LEARNING', 'legacy-v1').timerMode).toBe('deadline');
    expect(resolveMockModePolicy('PRACTICE', 'legacy-v1').canPause).toBe(false);
    expect(() => resolveMockModePolicy('LEARNING', 'v2')).toThrow();
  });
});
