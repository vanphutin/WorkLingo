import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiSettingsClient } from '../../lib/api/ai-settings-client';
import { AiSettingsPanel } from './ai-settings-panel';
import { LocaleProvider } from '../../i18n/provider';

const settings = { routingEnabled: true, canManageSystem: false, accountId: '00000000-0000-4000-8000-000000000001', preferredProvider: 'system-default' as const, fallbackEnabled: true, effectiveProvider: 'discovery' as const, effectiveFallbackEnabled: true, systemFallbackEnabled: true, simulation: false, maxOutputTokens: 2048, providers: [{ id: 'discovery' as const, available: true, model: 'intern-s2' }, { id: 'openai' as const, available: false, model: null }] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('AI settings panel', () => {
  it('keeps one page heading when account settings accompany system settings', async () => {
    vi.spyOn(aiSettingsClient, 'get').mockResolvedValue(settings);
    render(<><AiSettingsPanel admin /><AiSettingsPanel headingLevel={2} /></>);
    expect(await screen.findAllByRole('combobox')).toHaveLength(2);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('System AI settings');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('AI settings');
  });
  it('saves Discovery selection and fallback opt-out, and disables unconfigured OpenAI', async () => {
    vi.spyOn(aiSettingsClient, 'get').mockResolvedValue(settings);
    vi.spyOn(aiSettingsClient, 'update').mockImplementation(async (_admin, input) => ({ ...settings, ...input, effectiveFallbackEnabled: input.fallbackEnabled }));
    render(<AiSettingsPanel />);
    const selection = await screen.findByRole('combobox', { name: 'Preferred AI provider' });
    expect(screen.getByRole('option', { name: /OpenAI/ })).toBeDisabled();
    fireEvent.change(selection, { target: { value: 'discovery' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Allow fallback/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save AI settings' }));
    expect(await screen.findByRole('status')).toHaveTextContent('AI settings saved');
    expect(selection).toHaveValue('discovery');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('shows localized settings and safely handles load errors', async () => {
    vi.spyOn(aiSettingsClient, 'get').mockRejectedValueOnce(new Error('private credential details')).mockResolvedValueOnce(settings);
    render(<LocaleProvider initialLocale="vi"><AiSettingsPanel /></LocaleProvider>);
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private credential details');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('combobox', { name: 'Nhà cung cấp AI ưu tiên' })).toHaveValue('system-default');
  });
});
