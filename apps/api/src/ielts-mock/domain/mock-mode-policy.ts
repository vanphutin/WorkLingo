import type { IeltsMockPolicyVersion, NewIeltsMockMode } from '@worklingo/contracts';
export interface MockModePolicy { timerMode: 'elapsed' | 'deadline'; canPause: boolean; feedbackRelease: 'section' | 'test'; audioPlayLimit: 1 | null }
export function resolveMockModePolicy(mode: NewIeltsMockMode | 'LEARNING', policyVersion: IeltsMockPolicyVersion): MockModePolicy {
  if (policyVersion === 'v2' && mode === 'LEARNING') throw new RangeError('New mock attempts support Practice or Exam Simulation.');
  return { timerMode: policyVersion === 'v2' && mode === 'PRACTICE' ? 'elapsed' : 'deadline', canPause: policyVersion === 'v2' && mode === 'PRACTICE', feedbackRelease: policyVersion === 'v2' && mode === 'PRACTICE' ? 'section' : 'test', audioPlayLimit: mode === 'EXAM_SIMULATION' ? 1 : null };
}
