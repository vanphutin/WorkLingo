import { describe, expect, it } from 'vitest';

import {
  assertCalibrationRanges,
  runGoldenCalibration,
  type CalibrationFixtureResult,
} from './evaluation-harness.js';

describe('Teacher AI golden evaluation harness', () => {
  it('records fixture, rubric and provider versions and is deterministic in fake mode', async () => {
    const first = await runGoldenCalibration({ mode: 'fake', generatedAt: '2026-10-08T00:00:00.000Z' });
    const second = await runGoldenCalibration({ mode: 'fake', generatedAt: '2026-10-08T00:00:00.000Z' });

    expect(first).toEqual(second);
    expect(first.fixtureVersion).toBe('foundation-golden-v1');
    expect(first.providerMode).toBe('fake');
    expect(first.rubrics).toEqual(expect.arrayContaining([
      { id: 'foundation-speaking-shadowing', version: '1' },
      { id: 'foundation-workplace-writing', version: '1' },
    ]));
    expect(first.humanCalibration).toBe('pending');
    expect(first.results.every((result) => result.inExpectedRange)).toBe(true);
  });

  it('fails the calibration gate when a fixture score leaves its expected range', () => {
    const invalid: CalibrationFixtureResult[] = [{
      fixtureId: 'writing-clear-update', activityType: 'writing', score: 0.2,
      expectedMin: 0.7, expectedMax: 0.9, inExpectedRange: false,
    }];

    expect(() => assertCalibrationRanges(invalid)).toThrow(/writing-clear-update/u);
  });

  it('keeps live providers opt-in and reports missing credentials as skipped', async () => {
    const report = await runGoldenCalibration({ mode: 'live', env: {}, generatedAt: '2026-10-08T00:00:00.000Z' });

    expect(report.liveRun).toEqual({ status: 'skipped', reason: 'missing_provider_credentials' });
    expect(report.results).toEqual([]);
  });
});
