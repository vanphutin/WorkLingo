import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsIntegratedClient } from '../../lib/api/ielts-integrated-client';
import { IntegratedPracticeDashboardCard } from './integrated-practice';

vi.mock('../../lib/api/ielts-integrated-client', () => ({ ieltsIntegratedClient: { availability: vi.fn() } }));
afterEach(cleanup);

describe('IntegratedPracticeDashboardCard', () => {
  it('explains the Bridge gate without exposing a start action', async () => {
    vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: false, lockedReason: 'BRIDGE_REQUIRED', durations: [], difficulties: [], activeSessionId: null });
    render(<IntegratedPracticeDashboardCard />);
    expect(await screen.findByText('Complete IELTS Bridge to unlock integrated four-skill practice.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links directly to the immutable active session', async () => {
    const activeSessionId = crypto.randomUUID();
    vi.mocked(ieltsIntegratedClient.availability).mockResolvedValue({ eligible: true, lockedReason: null, durations: [60, 90, 120, 150], difficulties: ['foundation', 'developing', 'competent', 'advanced'], activeSessionId });
    render(<IntegratedPracticeDashboardCard />);
    expect((await screen.findByRole('link', { name: 'Resume Integrated Practice' })).getAttribute('href')).toBe(`/ielts/practice/${activeSessionId}`);
  });
});
