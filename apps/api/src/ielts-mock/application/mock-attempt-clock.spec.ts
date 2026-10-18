import { describe, expect, it } from 'vitest';
import { mockElapsedMilliseconds } from './mock-attempt-state.js';
describe('Server elapsed mock time', () => {
  const initial = { policyVersion: 'v2', elapsedMs: 12_000, pausedAt: null, clockUpdatedAt: new Date('2026-10-15T00:00:00Z'), status: 'IN_PROGRESS' };
  it('adds only running server time and never negative clock drift', () => {
    expect(mockElapsedMilliseconds(initial, new Date('2026-10-15T00:00:05Z'))).toBe(17_000);
    expect(mockElapsedMilliseconds(initial, new Date('2026-10-14T23:59:00Z'))).toBe(12_000);
  });
  it('freezes a paused attempt and leaves legacy timing untouched', () => {
    expect(mockElapsedMilliseconds({ ...initial, pausedAt: initial.clockUpdatedAt }, new Date('2026-10-15T02:00:00Z'))).toBe(12_000);
    expect(mockElapsedMilliseconds({ ...initial, policyVersion: 'legacy-v1' }, new Date('2026-10-15T02:00:00Z'))).toBe(0);
  });
});
