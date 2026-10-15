import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/provider';
import { LanguageSwitcher } from './language-switcher';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('LanguageSwitcher', () => {
  it('exposes both language names, selection and translated accessible label', async () => {
    render(<LocaleProvider initialLocale="vi"><LanguageSwitcher /></LocaleProvider>);
    expect(screen.getByRole('option', { name: 'Tiếng Việt' })).toBeVisible();
    const select = screen.getByRole('combobox', { name: 'Ngôn ngữ giao diện' });
    expect(select).toHaveValue('vi');
    fireEvent.change(select, { target: { value: 'en' } });
    expect(await screen.findByRole('combobox', { name: 'Interface language' })).toHaveValue('en');
  });
  it('exposes a saving status only during an authenticated save, without an empty idle status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><LanguageSwitcher /></LocaleProvider>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    expect(await screen.findByRole('status')).toHaveTextContent('Saving language…');
  });
});
