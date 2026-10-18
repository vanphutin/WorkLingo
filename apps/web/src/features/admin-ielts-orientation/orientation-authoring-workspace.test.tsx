import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminIeltsOrientationClient } from '../../lib/api/admin-ielts-orientation-client';
import { ApiError } from '../../lib/api/api-client';
import { OrientationAuthoringWorkspace } from './orientation-authoring-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

vi.mock('../../lib/api/admin-ielts-orientation-client', () => ({
  adminIeltsOrientationClient: { get: vi.fn(), updateDraft: vi.fn(), validate: vi.fn(), publish: vi.fn(), archive: vi.fn(), uploadMedia: vi.fn() },
}));

const slide = { id: '11111111-1111-4111-8111-111111111111', slug: 'welcome', title: 'Welcome', body: 'Body', transcript: 'Transcript', imageAssetId: null, audioAssetId: null, question: null };
const orientation = { id: '22222222-2222-4222-8222-222222222222', slug: 'ielts-orientation', status: 'DRAFT' as const, draftRevision: 1, draft: { title: 'IELTS Orientation', description: 'Introduction', slides: [slide, { ...slide, id: '33333333-3333-4333-8333-333333333333', slug: 'format' }, { ...slide, id: '44444444-4444-4444-8444-444444444444', slug: 'ready' }] }, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() };

describe('OrientationAuthoringWorkspace', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminIeltsOrientationClient.get).mockResolvedValue(orientation);
    vi.mocked(adminIeltsOrientationClient.updateDraft).mockResolvedValue({ ...orientation, draftRevision: 2 });
    vi.mocked(adminIeltsOrientationClient.validate).mockResolvedValue({ draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });
  });

  it('localizes authoring controls while preserving the mounted English slide draft', async () => {
    render(<LocaleProvider initialLocale="vi"><LocaleToggle /><OrientationAuthoringWorkspace /></LocaleProvider>);
    const title = await screen.findByLabelText('Tiêu đề trang chiếu');
    expect((title as HTMLInputElement).value).toBe('Welcome');
    fireEvent.change(title, { target: { value: 'My unsaved English slide' } });
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).not.toBeNull();
    expect(screen.getByText('Bản nháp')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByLabelText('Slide title')).toBe(title);
    expect((title as HTMLInputElement).value).toBe('My unsaved English slide');
    expect(adminIeltsOrientationClient.get).toHaveBeenCalledTimes(1);
    expect(title.getAttribute('lang')).toBe('en');
  });

  it('localizes validation feedback and re-renders it when the locale changes', async () => {
    vi.mocked(adminIeltsOrientationClient.validate).mockResolvedValue({ draftRevision: 1, status: 'DRAFT', canPublish: false, issues: [{ code: 'TRANSCRIPT_REQUIRED', path: 'slides.0.transcript', message: 'Transcript is required.' }] });
    render(<LocaleProvider initialLocale="vi"><LocaleToggle /><OrientationAuthoringWorkspace /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Kiểm tra bản nháp' }));
    expect(await screen.findByText('Cần có bản chép lời.')).not.toBeNull();
    expect(screen.getByText('slides.0.transcript')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Xuất bản phiên bản' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByText('Transcript is required.')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Resolve validation issues before publishing.');
  });

  it('formats published versions in Vietnamese and localizes confirmation without changing the authored title', async () => {
    vi.mocked(adminIeltsOrientationClient.get).mockResolvedValue({ ...orientation, draft: { ...orientation.draft, slides: [...orientation.draft.slides, { ...slide, id: crypto.randomUUID(), slug: 'extra' }] }, versions: [{ id: crypto.randomUUID(), version: 1000, status: 'PUBLISHED', publishedAt: '2026-10-14T12:00:00.000Z' }] });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LocaleProvider initialLocale="vi"><OrientationAuthoringWorkspace /></LocaleProvider>);
    expect(await screen.findByText(/Phiên bản 1\.000 · Đã xuất bản ·/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa trang chiếu' }));
    expect(confirm).toHaveBeenCalledWith('Xóa trang chiếu "Welcome"? Thay đổi này chưa được lưu.');
    expect(screen.getAllByRole('button', { name: /Welcome$/ })).toHaveLength(4);
    confirm.mockRestore();
  });

  it('shows a localized initial API failure instead of hiding it behind loading', async () => {
    vi.mocked(adminIeltsOrientationClient.get).mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'Technical transport failure' }));
    render(<LocaleProvider initialLocale="vi"><LocaleToggle /><OrientationAuthoringWorkspace /></LocaleProvider>);
    expect((await screen.findByRole('alert')).textContent).toBe('Mất kết nối. Kiểm tra kết nối rồi thử lại.');
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(screen.getByRole('alert').textContent).toBe('Connection failed. Check your connection and try again.');
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

  it('requires confirmation before deleting a slide or archiving a release', async () => {
    const fourthSlide = { ...slide, id: '55555555-5555-4555-8555-555555555555', slug: 'extra' };
    vi.mocked(adminIeltsOrientationClient.get).mockResolvedValue({
      ...orientation,
      draft: { ...orientation.draft, slides: [...orientation.draft.slides, fourthSlide] },
      versions: [{ id: crypto.randomUUID(), version: 1, status: 'PUBLISHED', publishedAt: new Date().toISOString() }],
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OrientationAuthoringWorkspace />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete slide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive release' }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(adminIeltsOrientationClient.archive).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /Welcome$/ })).toHaveLength(4);
  });

  it('retains slide edits across selection and removes only from the current draft', async () => {
    const historical = { id: crypto.randomUUID(), version: 1, status: 'PUBLISHED' as const, publishedAt: '2026-10-14T12:00:00.000Z' };
    vi.mocked(adminIeltsOrientationClient.get).mockResolvedValue({ ...orientation, versions: [historical] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<OrientationAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Slide title'), { target: { value: 'Edited draft slide' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add slide' }));
    fireEvent.change(screen.getByLabelText('Slide title'), { target: { value: 'Temporary slide' } });
    fireEvent.click(screen.getByRole('button', { name: /Edited draft slide$/ }));
    expect((screen.getByLabelText('Slide title') as HTMLInputElement).value).toBe('Edited draft slide');
    fireEvent.click(screen.getByRole('button', { name: /Temporary slide$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete slide' }));
    expect(screen.getByText(/Slide changes affect only this draft/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(adminIeltsOrientationClient.updateDraft).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, content: expect.objectContaining({ slides: expect.arrayContaining([expect.objectContaining({ title: 'Edited draft slide' })]) }) })));
    expect(vi.mocked(adminIeltsOrientationClient.updateDraft).mock.calls[0]![0].content.slides).toHaveLength(3);
    expect(screen.getByText(/Version 1 · Published/)).not.toBeNull();
    expect(adminIeltsOrientationClient.archive).not.toHaveBeenCalled();
  });

  it('prevents slide navigation and edits while a draft save is pending', async () => {
    let finish!: (value: typeof orientation) => void;
    vi.mocked(adminIeltsOrientationClient.updateDraft).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<OrientationAuthoringWorkspace />);
    const title = await screen.findByLabelText('Slide title');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(title.closest('fieldset')?.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Add slide' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('button', { name: /Welcome$/ })[1]!.hasAttribute('disabled')).toBe(true);
    await act(async () => finish(orientation));
  });
});
