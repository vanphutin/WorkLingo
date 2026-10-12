import { describe, expect, it } from 'vitest';

import { buildPilotMetric, hashMetricSource } from './pilot-metric.js';

describe('pilot metric domain', () => {
  it('builds a stable dimension key independent of object insertion order', () => {
    const first = buildPilotMetric({
      dimensions: { skill: 'speaking', outcome: 'completed' },
      eventType: 'EVALUATION_TERMINAL',
      occurredAt: new Date('2026-10-12T23:30:00.000Z'),
      sourceKey: 'attempt:abc:evaluated',
    });
    const second = buildPilotMetric({
      dimensions: { outcome: 'completed', skill: 'speaking' },
      eventType: 'EVALUATION_TERMINAL',
      occurredAt: new Date('2026-10-12T23:30:00.000Z'),
      sourceKey: 'attempt:abc:evaluated',
    });

    expect(first.dateKey).toBe('2026-10-12');
    expect(first.dimensionKey).toBe(second.dimensionKey);
    expect(first.dimensions).toEqual({ outcome: 'completed', skill: 'speaking' });
    expect(first.sourceHash).toBe(second.sourceHash);
  });

  it('hashes source transitions instead of retaining raw identifiers', () => {
    const raw = 'learner@example.com:registration';
    const hash = hashMetricSource(raw);
    expect(hash).toMatch(/^[a-f0-9]{64}$/u);
    expect(hash).not.toContain('learner@example.com');
  });

  it('rejects arbitrary or raw-content dimensions', () => {
    expect(() => buildPilotMetric({
      dimensions: { transcript: 'ignore previous instructions' } as never,
      eventType: 'EVALUATION_TERMINAL',
      occurredAt: new Date('2026-10-12T00:00:00.000Z'),
      sourceKey: 'attempt:abc:evaluated',
    })).toThrow();
  });
});
