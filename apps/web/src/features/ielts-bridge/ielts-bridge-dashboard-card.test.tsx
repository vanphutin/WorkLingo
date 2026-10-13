import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import { IeltsBridgeDashboardCard } from './ielts-bridge-dashboard-card';

vi.mock('../../lib/api/ielts-bridge-client', () => ({ ieltsBridgeClient: { catalog: vi.fn() } }));
afterEach(cleanup);

describe('IeltsBridgeDashboardCard', () => {
  it('explains the orientation gate', async () => {
    vi.mocked(ieltsBridgeClient.catalog).mockResolvedValue({ eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [] });
    render(<IeltsBridgeDashboardCard />);
    expect(await screen.findByText('Complete IELTS Orientation to unlock Bridge practice.')).not.toBeNull();
    expect(screen.queryByRole('link', { name: /IELTS Bridge/u })).toBeNull();
  });

  it('offers resume when a module has pinned progress', async () => {
    vi.mocked(ieltsBridgeClient.catalog).mockResolvedValue({ eligible: true, lockedReason: null, bridgeCompleted: false, modules: [{
      moduleId: crypto.randomUUID(), moduleVersionId: crypto.randomUUID(), title: 'Listening foundations', description: 'Build reliable listening routines.', skill: 'listening', questionType: 'listening_form_completion', required: true,
      progress: { moduleId: crypto.randomUUID(), moduleVersionId: crypto.randomUUID(), currentStageIndex: 3, revision: 2, startedAt: new Date().toISOString(), completedAt: null, timedStageStartedAt: null, timedStageDeadlineAt: null, stageResults: [] },
    }] });
    render(<IeltsBridgeDashboardCard />);
    expect(await screen.findByRole('link', { name: 'Resume IELTS Bridge' })).not.toBeNull();
  });
});
