import { describe, expect, it } from 'vitest';
import * as contracts from './index.js';

describe('independent IELTS sections', () => {
  it('represents unavailable introduction without locking study or mock', () => {
    const overview = { flowVersion: 'v3', introduction: { available: false, reason: 'CONTENT_UNAVAILABLE', resumeHref: null }, study: { available: true, reason: null, resumeHref: '/sessions/owned' }, mock: { available: true, reason: null, resumeHref: null } };
    expect(contracts.ieltsFlowOverviewSchema.parse(overview)).toEqual(overview);
  });
  it('requires a content reason for unavailable sections', () => {
    const section = { available: false, reason: null, resumeHref: null };
    expect(contracts.ieltsFlowOverviewSchema.safeParse({ flowVersion: 'v3', introduction: section, study: section, mock: section }).success).toBe(false);
  });
});
