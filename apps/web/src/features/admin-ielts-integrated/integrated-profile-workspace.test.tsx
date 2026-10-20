import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { INITIAL_IELTS_INTEGRATED_PROFILES } from '@worklingo/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';
import { adminIeltsIntegratedClient } from '../../lib/api/admin-ielts-integrated-client';
import { IntegratedProfileWorkspace } from './integrated-profile-workspace';

vi.mock('../../lib/api/admin-ielts-integrated-client', () => ({ adminIeltsIntegratedClient: { list: vi.fn(), update: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

it('localizes skill allocations and retains unsaved minutes in the mounted input', async () => {
  vi.mocked(adminIeltsIntegratedClient.list).mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', durationMinutes: 60, status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_INTEGRATED_PROFILES[0]!, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }]);
  render(<LocaleProvider initialLocale="vi"><LocaleToggle /><IntegratedProfileWorkspace /></LocaleProvider>);
  const minutes = await screen.findByLabelText('Nghe');
  fireEvent.change(minutes, { target: { value: '18' } });
  expect(screen.getByRole('button', { name: 'Lưu và kiểm tra' })).not.toBeNull();
  expect(screen.getByRole('heading', { name: 'Phân bổ 60 phút' })).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(await screen.findByLabelText('listening')).toBe(minutes);
  expect((minutes as HTMLInputElement).value).toBe('18');
  expect(adminIeltsIntegratedClient.list).toHaveBeenCalledTimes(1);
});

it('shows Vietnamese allocation validation and enables publishing only for a valid saved revision', async () => {
  const profile = { id: '11111111-1111-4111-8111-111111111111', durationMinutes: 60 as const, status: 'DRAFT' as const, draftRevision: 1, draft: INITIAL_IELTS_INTEGRATED_PROFILES[0]!, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() };
  vi.mocked(adminIeltsIntegratedClient.list).mockResolvedValue([profile]);
  vi.mocked(adminIeltsIntegratedClient.update).mockResolvedValue({ ...profile, draftRevision: 2 });
  vi.mocked(adminIeltsIntegratedClient.validate).mockResolvedValueOnce({ profileId: profile.id, draftRevision: 2, status: 'DRAFT', canPublish: false, issues: [{ code: 'INVALID_PROFILE', path: 'allocations', message: 'Allocation minutes must equal session duration' }] }).mockResolvedValueOnce({ profileId: profile.id, draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });
  render(<LocaleProvider initialLocale="vi"><LocaleToggle /><IntegratedProfileWorkspace /></LocaleProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Lưu và kiểm tra' }));
  expect(await screen.findByText('Tổng số phút phân bổ phải bằng thời lượng buổi học')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Xuất bản phiên bản' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Lưu và kiểm tra' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản phiên bản' }).hasAttribute('disabled')).toBe(false));
  expect(screen.getByRole('status').textContent).toBe('Đã lưu bản nháp và sẵn sàng xuất bản.');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(screen.getByRole('status').textContent).toBe('Draft saved and ready to publish.');
});

it('labels the four fixed durations as configuration and links lesson authoring', async () => {
  vi.mocked(adminIeltsIntegratedClient.list).mockResolvedValue(INITIAL_IELTS_INTEGRATED_PROFILES.map((draft) => ({ id: String(draft.durationMinutes), durationMinutes: draft.durationMinutes, status: 'DRAFT', draftRevision: 1, draft, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() })));
  render(<IntegratedProfileWorkspace />);
  await screen.findByRole('button', { name: '60 min' });
  expect(screen.getByRole('link', { name: 'Author lesson content' }).getAttribute('href')).toBe('/admin/content');
  expect(screen.getByText(/four fixed duration profiles/i)).not.toBeNull();
  fireEvent.change(screen.getByLabelText('listening'), { target: { value: '18' } });
  fireEvent.click(screen.getByRole('button', { name: '90 min' }));
  fireEvent.click(screen.getByRole('button', { name: '60 min' }));
  expect((screen.getByLabelText('listening') as HTMLInputElement).value).toBe('18');
  expect(screen.getByRole('button', { name: '120 min' })).not.toBeNull();
  expect(screen.getByRole('button', { name: '150 min' })).not.toBeNull();
});

it('keeps edits in another profile when publishing refreshes saved profiles', async () => {
  const profiles = INITIAL_IELTS_INTEGRATED_PROFILES.map((draft) => ({ id: String(draft.durationMinutes), durationMinutes: draft.durationMinutes, status: 'DRAFT' as const, draftRevision: 1, draft, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }));
  vi.mocked(adminIeltsIntegratedClient.list).mockResolvedValue(profiles);
  vi.mocked(adminIeltsIntegratedClient.update).mockResolvedValue({ ...profiles[1]!, draftRevision: 2 });
  vi.mocked(adminIeltsIntegratedClient.validate).mockResolvedValue({ profileId: '90', draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });
  vi.mocked(adminIeltsIntegratedClient.publish).mockResolvedValue({ profileId: '90', profileVersionId: crypto.randomUUID(), version: 1, publishedAt: new Date().toISOString() });
  render(<IntegratedProfileWorkspace />);
  fireEvent.change(await screen.findByLabelText('listening'), { target: { value: '18' } });
  fireEvent.click(screen.getByRole('button', { name: '90 min' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save & validate' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Publish version' }));
  await waitFor(() => expect(adminIeltsIntegratedClient.list).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: '60 min' }));
  expect((screen.getByLabelText('listening') as HTMLInputElement).value).toBe('18');
});

it('prevents selection and field changes while an allocation save is pending', async () => {
  const profiles = INITIAL_IELTS_INTEGRATED_PROFILES.map((draft) => ({ id: String(draft.durationMinutes), durationMinutes: draft.durationMinutes, status: 'DRAFT' as const, draftRevision: 1, draft, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() }));
  vi.mocked(adminIeltsIntegratedClient.list).mockResolvedValue(profiles);
  let finish!: (value: typeof profiles[number]) => void;
  vi.mocked(adminIeltsIntegratedClient.update).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<IntegratedProfileWorkspace />);
  await screen.findByLabelText('listening');
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect((screen.getByLabelText('listening') as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: '90 min' }).hasAttribute('disabled')).toBe(true);
  await act(async () => finish(profiles[0]!));
});
