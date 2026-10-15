import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
