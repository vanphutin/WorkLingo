import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../i18n/provider';
import NotFound from './not-found';
import ErrorPage from './error';
afterEach(cleanup);

describe('shared localized error states', () => {
  it('renders an accessible Vietnamese missing-page state with a return route', () => {
    render(<LocaleProvider initialLocale="vi"><NotFound /></LocaleProvider>);
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Về WorkLingo' })).toHaveAttribute('href', '/');
  });
  it('provides localized retry without exposing internal error details', () => {
    const reset = vi.fn();
    const retry = vi.fn();
    // Installed Next16 supplies both reset and retry; retry is the existing owner contract.
    const props = { error: new Error('private database credentials'), reset, retry };
    render(<LocaleProvider initialLocale="vi"><ErrorPage {...props} /></LocaleProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Đã có lỗi xảy ra. Vui lòng thử lại.');
    expect(screen.queryByText(/private database/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  });
});
