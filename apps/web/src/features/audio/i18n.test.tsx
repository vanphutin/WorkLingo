import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { AudioSettingsPanel } from './audio-settings-panel';
import { BrowserSpeechControls } from './browser-speech-controls';
import { AdminAudioSettingsPanel } from './admin-audio-settings-panel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('localizes the learner audio panel while preserving the English speech preview', async () => {
  vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockResolvedValue({ sourceId: 'browser-tts', browserVoiceId: null });
  render(<LocaleProvider initialLocale="vi"><AudioSettingsPanel /></LocaleProvider>);
  expect(await screen.findByRole('heading', { name: 'Cài đặt âm thanh' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /Giọng đọc trình duyệt/ })).toBeChecked();
  expect(screen.getByText('Câu thử:')).toBeInTheDocument();
  expect(screen.getByText('Could you share the updated project timeline with the team?')).toHaveAttribute('lang', 'en');
});

it('localizes unsupported speech controls and their accessible names', () => {
  render(<LocaleProvider initialLocale="vi"><BrowserSpeechControls lang="en-US" text="Hello team" /></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Phát thử' })).toBeDisabled();
  expect(screen.getByText('Thiết bị này không hỗ trợ giọng đọc trình duyệt.')).toBeInTheDocument();
});

it('localizes the admin simulation provider while retaining technical voice identifiers', async () => {
  vi.spyOn(audioSettingsClient, 'getAdminSettings').mockResolvedValue({
    providerId: 'fake-tts', defaultVoiceId: 'fake-neutral', providers: [{
      id: 'fake-tts', displayName: 'Simulation audio', simulation: true,
      available: true, defaultVoiceId: 'fake-neutral', supportedLocales: ['en-US'],
    }],
  });
  render(<LocaleProvider initialLocale="vi"><AdminAudioSettingsPanel /></LocaleProvider>);
  expect(await screen.findByRole('radio', { name: /Âm thanh mô phỏng/ })).toBeChecked();
  expect(screen.getByRole('option', { name: 'fake-neutral' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Lưu cài đặt nhà cung cấp' })).toBeEnabled();
});

it('shows localized API permission errors when audio settings cannot be loaded', async () => {
  vi.spyOn(audioSettingsClient, 'getLearnerSettings').mockRejectedValue({ code: 'FORBIDDEN', status: 403 });
  render(<LocaleProvider initialLocale="vi"><AudioSettingsPanel /></LocaleProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền thực hiện thao tác này.');
});
