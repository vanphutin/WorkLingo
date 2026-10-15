import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider, useLocalePreference, useT } from './provider';

const messages = { en: { title: 'Continue' }, vi: { title: 'Tiếp tục' } } as const;
function Form() {
  const t = useT('test', messages);
  const { locale, setLocale, synchronizeUser } = useLocalePreference();
  return <><input aria-label="Answer" defaultValue="" /><p>{t('title')}</p>
    <button onClick={() => void setLocale(locale === 'vi' ? 'en' : 'vi')}>Switch</button>
    <button onClick={() => synchronizeUser({ id: 'account-b', locale: 'vi' })}>Account B</button></>;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('locale preference', () => {
  it('switches a mounted form without losing its answer and writes a validated cookie', async () => {
    render(<LocaleProvider initialLocale="vi"><Form /></LocaleProvider>);
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'My English answer' } });
    fireEvent.click(screen.getByText('Switch'));
    expect(await screen.findByText('Continue')).toBeVisible();
    expect(screen.getByLabelText('Answer')).toHaveValue('My English answer');
    expect(document.cookie).toContain('worklingo_locale=en');
    expect(document.documentElement.lang).toBe('en');
  });
  it('does not apply an old save result after switching accounts', async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal('fetch', fetcher);
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByText('Account B'));
    finish?.(new Response(JSON.stringify({ locale: 'en' }), { status: 200 }));
    await waitFor(() => expect(screen.getByText('Tiếp tục')).toBeVisible());
    expect(document.documentElement.lang).toBe('vi');
    expect(localStorage.getItem('worklingo_locale_event')).toBeNull();
  });
  it('ignores browser events belonging to a different signed-in account', async () => {
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent(window, new StorageEvent('storage', { key: 'worklingo_locale_event', newValue: JSON.stringify({ userId: 'account-b', locale: 'en' }) }));
    expect(screen.getByText('Tiếp tục')).toBeVisible();
    fireEvent(window, new StorageEvent('storage', { key: 'worklingo_locale_event', newValue: JSON.stringify({ userId: 'account-a', locale: 'en' }) }));
    expect(await screen.findByText('Continue')).toBeVisible();
  });
  it('keeps guest switching usable when local storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<LocaleProvider initialLocale="vi"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    expect(await screen.findByText('Continue')).toBeVisible();
  });
  it('binds an authenticated save to the account that made the selection', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ locale: 'en' })));
    vi.stubGlobal('fetch', fetcher);
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ headers: { 'x-worklingo-account-id': 'account-a' } });
  });
  it('does not overwrite a pending explicit selection on window focus', async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetcher = vi.fn((url: string) => url.endsWith('/preferences')
      ? new Promise<Response>((resolve) => { finish = resolve; })
      : Promise.resolve(new Response(JSON.stringify({ id: 'account-a', locale: 'vi' }))));
    vi.stubGlobal('fetch', fetcher);
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    fireEvent.focus(window);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText('Continue')).toBeVisible();
    finish?.(new Response(JSON.stringify({ locale: 'en' })));
  });
  it('rolls back to the last persisted language when multiple rapid saves fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    fireEvent.click(screen.getByText('Switch'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText('Tiếp tục')).toBeVisible();
  });
  it('requests an authentication transition before adopting another account discovered on focus', async () => {
    const changed = vi.fn();
    window.addEventListener('worklingo-account-changed', changed);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'account-b', locale: 'en' }))));
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.focus(window);
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(screen.getByText('Tiếp tục')).toBeVisible();
    window.removeEventListener('worklingo-account-changed', changed);
  });
  it('broadcasts the persisted language when a later queued save fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ locale: 'en' }))).mockResolvedValueOnce(new Response('', { status: 500 })));
    render(<LocaleProvider initialLocale="vi" initialUserId="account-a"><Form /></LocaleProvider>);
    fireEvent.click(screen.getByText('Switch'));
    fireEvent.click(screen.getByText('Switch'));
    await waitFor(() => expect(screen.getByText('Continue')).toBeVisible());
    expect(JSON.parse(localStorage.getItem('worklingo_locale_event') ?? '{}')).toMatchObject({ userId: 'account-a', locale: 'en' });
  });
});
