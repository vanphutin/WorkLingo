import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminIeltsOrientationClient } from '../../lib/api/admin-ielts-orientation-client';
import { ApiError } from '../../lib/api/api-client';
import { OrientationAuthoringWorkspace } from './orientation-authoring-workspace';

vi.mock('../../lib/api/admin-ielts-orientation-client', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/admin-ielts-orientation-client')>('../../lib/api/admin-ielts-orientation-client');
  return { ...actual, adminIeltsOrientationClient: { get: vi.fn(), updateDraft: vi.fn(), validate: vi.fn(), publish: vi.fn(), archive: vi.fn(), uploadMedia: vi.fn() } };
});

const slide = { id: '11111111-1111-4111-8111-111111111111', slug: 'welcome', title: 'Welcome', body: 'Body', transcript: 'Transcript', imageAssetId: null, audioAssetId: null, question: null };
const orientation = { id: '22222222-2222-4222-8222-222222222222', slug: 'ielts-orientation', status: 'DRAFT' as const, draftRevision: 1, draft: { title: 'IELTS Orientation', description: 'Introduction', slides: [slide, { ...slide, id: '33333333-3333-4333-8333-333333333333', slug: 'format' }, { ...slide, id: '44444444-4444-4444-8444-444444444444', slug: 'ready' }] }, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() };

describe('OrientationAuthoringWorkspace', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminIeltsOrientationClient.get).mockResolvedValue(orientation);
    vi.mocked(adminIeltsOrientationClient.updateDraft).mockResolvedValue({ ...orientation, draftRevision: 2 });
    vi.mocked(adminIeltsOrientationClient.validate).mockResolvedValue({ draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });
  });

  it('edits and saves a selected slide with the current optimistic revision', async () => {
    render(<OrientationAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Slide title'), { target: { value: 'Start here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(adminIeltsOrientationClient.updateDraft).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, content: expect.objectContaining({ slides: expect.arrayContaining([expect.objectContaining({ title: 'Start here' })]) }) })));
  });

  it('shows semantic validation issues and publishes only after validation succeeds', async () => {
    vi.mocked(adminIeltsOrientationClient.validate)
      .mockResolvedValueOnce({ draftRevision: 1, status: 'DRAFT', canPublish: false, issues: [{ code: 'TRANSCRIPT_REQUIRED', path: 'slides.0.transcript', message: 'Transcript is required.' }] })
      .mockResolvedValueOnce({ draftRevision: 1, status: 'VALIDATED', canPublish: true, issues: [] });
    vi.mocked(adminIeltsOrientationClient.publish).mockResolvedValue({ orientationId: orientation.id, orientationVersionId: crypto.randomUUID(), version: 1, publishedAt: new Date().toISOString() });
    render(<OrientationAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Validate draft' }));
    expect(await screen.findByText('Transcript is required.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Validate draft' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Publish version' }));
    await waitFor(() => expect(adminIeltsOrientationClient.publish).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1 })));
  });

  it('reloads the latest draft after a stale revision conflict', async () => {
    vi.mocked(adminIeltsOrientationClient.updateDraft).mockRejectedValue(new ApiError({ code: 'ORIENTATION_REVISION_STALE', message: 'Stale.', status: 409 }));
    render(<OrientationAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('The draft changed elsewhere. Latest revision loaded; review before retrying.')).not.toBeNull();
    expect(adminIeltsOrientationClient.get).toHaveBeenCalledTimes(2);
  });
});
