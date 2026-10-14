import { cleanup, render, screen } from '@testing-library/react';
import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { adminIeltsBandClient } from '../../lib/api/admin-ielts-band-client';
import { BandCurriculumWorkspace } from './band-curriculum-workspace';

vi.mock('../../lib/api/admin-ielts-band-client', () => ({ adminIeltsBandClient: { get: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
afterEach(cleanup);

it('shows all seven authored stages and immutable publishing controls', async () => {
  vi.mocked(adminIeltsBandClient.get).mockResolvedValue({ id: crypto.randomUUID(), status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() });
  render(<BandCurriculumWorkspace />);
  expect(await screen.findByRole('button', { name: '8.0 to 9.0' })).not.toBeNull();
  expect(screen.getByLabelText('Stage definition JSON')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Save & validate' })).not.toBeNull();
});
