import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import { IeltsMockDashboardCard } from './ielts-mock';

vi.mock('../../lib/api/ielts-mock-client', () => ({ ieltsMockClient: { catalog: vi.fn() } }));
afterEach(cleanup);

describe('IeltsMockDashboardCard', () => {
  it('explains the Band Pathway gate and does not offer a start link', async () => {
    vi.mocked(ieltsMockClient.catalog).mockResolvedValue({ eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED', mocks: [] });
    render(<IeltsMockDashboardCard />);
    expect(await screen.findByText('Start your IELTS Band Pathway before taking a full mock.')).not.toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
