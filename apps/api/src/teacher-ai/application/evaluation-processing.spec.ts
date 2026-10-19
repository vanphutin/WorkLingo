import { describe, expect, it } from 'vitest';
import { evaluationProcessingSteps } from './evaluation-processing.js';

describe('Learner evaluation processing stages', () => {
  it('waits for speech recognition before evaluating and does not claim a model', () => {
    expect(evaluationProcessingSteps('queued', { transcript: null, providerName: null }, null)).toEqual([
      { key: 'submission', status: 'completed', providerName: null, model: null },
      { key: 'transcription', status: 'queued', providerName: null, model: null },
      { key: 'evaluation', status: 'waiting', providerName: null, model: null },
    ]);
  });
  it('distinguishes completed recognition from a language job waiting to run', () => {
    const steps = evaluationProcessingSteps('processing', { transcript: 'Hello', providerName: 'microsoft-speech' }, null, { evaluation: 'PENDING' });
    expect(steps[1]).toEqual({ key: 'transcription', status: 'completed', providerName: 'microsoft-speech', model: null });
    expect(steps[2]).toEqual({ key: 'evaluation', status: 'queued', providerName: null, model: null });
  });
  it.each([false, true])('marks the failed phase without inventing a later completed phase (transcribed=%s)', transcribed => {
    const steps = evaluationProcessingSteps('evaluation_failed', { transcript: transcribed ? 'Hello' : null, providerName: null }, null);
    expect(steps.map(step => step.status)).toEqual(transcribed ? ['completed', 'completed', 'failed'] : ['completed', 'failed', 'waiting']);
  });
  it('retains completed recognition when an evaluated recording transcript is no longer retained', () => {
    const steps = evaluationProcessingSteps('evaluated', { transcript: null, providerName: 'microsoft-speech' }, { providerName: 'discovery', providerModel: 'qwen3.8-27b' });
    expect(steps.map(step => step.status)).toEqual(['completed', 'completed', 'completed']);
    expect(steps[2]?.model).toBe('qwen3.8-27b');
  });
});
