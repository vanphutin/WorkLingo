import { performance } from 'node:perf_hooks';
import { analyzeLessonSource } from '@worklingo/content-format';
import { describe, expect, it } from 'vitest';

import { buildQualificationDataset } from './qualification-seed.js';

describe('pilot performance qualification', () => {
  it('builds the approved deterministic volume twice with an identical fingerprint', () => {
    const first = buildQualificationDataset();
    const second = buildQualificationDataset();
    expect(first.masteryRows.length).toBeGreaterThanOrEqual(1_000);
    expect(first.auditRows).toHaveLength(10_000);
    expect(first.jobRows).toHaveLength(10_000);
    expect(first.lessonSource.length).toBeGreaterThanOrEqual(450_000);
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it('parses and validates the large lesson below the local 1 second p95 budget', () => {
    const source = buildQualificationDataset().lessonSource;
    analyzeLessonSource(source); // warm-up
    const samples = Array.from({ length: 10 }, () => {
      const startedAt = performance.now();
      const result = analyzeLessonSource(source);
      expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
      return performance.now() - startedAt;
    }).sort((left, right) => left - right);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
    expect(p95).toBeLessThan(1_000);
  });
});
