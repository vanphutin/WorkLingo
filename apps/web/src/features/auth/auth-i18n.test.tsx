import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { LanguageSwitcher } from '../../components/language-switcher';
import { AuthForm } from './auth-form';
afterEach(cleanup);
describe('localized authentication', () => {
  it('updates labels and existing validation without resetting entered values', async () => {
    render(<LocaleProvider initialLocale="vi"><LanguageSwitcher /><AuthForm mode="register" submit={async () => { throw new Error('unused'); }} onAuthenticated={() => undefined} /></LocaleProvider>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await screen.findByText('Tên hiển thị cần ít nhất 2 ký tự.')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
    expect(screen.getByLabelText('Email')).toHaveValue('an@example.com');
    expect(screen.getByText('Display name must contain at least 2 characters.')).toBeVisible();
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });
});
