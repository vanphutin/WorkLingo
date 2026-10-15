import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { adminIeltsBandClient } from '../../lib/api/admin-ielts-band-client';
import { BandCurriculumWorkspace } from './band-curriculum-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

vi.mock('../../lib/api/admin-ielts-band-client', () => ({ adminIeltsBandClient: { get: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
afterEach(cleanup);

it('localizes invalid JSON and retains the same source editor across a locale switch', async () => {
  vi.mocked(adminIeltsBandClient.get).mockResolvedValue({ id: crypto.randomUUID(), status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() });
  render(<LocaleProvider initialLocale="vi"><LocaleToggle /><BandCurriculumWorkspace /></LocaleProvider>);
  const source = await screen.findByLabelText('JSON định nghĩa giai đoạn');
  expect((source as HTMLTextAreaElement).value).toContain('foundation_to_3');
  fireEvent.change(source, { target: { value: '{unfinished English source' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Định nghĩa giai đoạn phải là JSON hợp lệ.');
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(await screen.findByLabelText('Stage definition JSON')).toBe(source);
  expect((source as HTMLTextAreaElement).value).toBe('{unfinished English source');
  expect(screen.getByRole('alert').textContent).toBe('Stage definition must be valid JSON.');
});

it('shows all seven authored stages and immutable publishing controls', async () => {
  vi.mocked(adminIeltsBandClient.get).mockResolvedValue({ id: crypto.randomUUID(), status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() });
  render(<BandCurriculumWorkspace />);
  expect(await screen.findByRole('button', { name: '8.0 to 9.0' })).not.toBeNull();
  expect(screen.getByLabelText('Stage definition JSON')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Save & validate' })).not.toBeNull();
});

it('localizes schema validation while retaining diagnostic paths and source text', async () => {
  vi.mocked(adminIeltsBandClient.get).mockResolvedValue({ id: crypto.randomUUID(), status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() });
  render(<LocaleProvider initialLocale="vi"><BandCurriculumWorkspace /></LocaleProvider>);
  const source = await screen.findByLabelText('JSON định nghĩa giai đoạn');
  fireEvent.change(source, { target: { value: '{}' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('Định nghĩa giai đoạn không hợp lệ.');
  expect(screen.getByText('targetBand')).not.toBeNull();
  expect((source as HTMLTextAreaElement).value).toBe('{}');
});
