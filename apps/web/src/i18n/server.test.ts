import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
import { resolveServerPreference } from './server';

describe('SSR locale resolution', () => {
  it('resolves guests from validated cookies without an API request', async () => {
    const fetcher = vi.fn();
    expect(await resolveServerPreference({ localeCookie: 'en' }, fetcher)).toEqual({ locale: 'en', userId: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the account preference over a previous account browser cookie', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 'account-a', locale: 'vi' }), { status: 200 }));
    expect(await resolveServerPreference({ localeCookie: 'en', sessionToken: 'test-session' }, fetcher)).toEqual({ locale: 'vi', userId: 'account-a' });
    const options = fetcher.mock.calls[0]?.[1];
    expect(options?.cache).toBe('no-store');
    expect(options?.headers).toEqual({ cookie: 'worklingo_session=test-session' });
  });
  it('falls back safely when the API is unavailable or returns an unsupported UI locale', async () => {
    expect(await resolveServerPreference({ localeCookie: 'en', sessionToken: 'test' }, async () => { throw new TypeError('offline'); })).toEqual({ locale: 'en', userId: null });
    expect(await resolveServerPreference({ localeCookie: 'en-US' }, vi.fn())).toEqual({ locale: 'vi', userId: null });
    expect(await resolveServerPreference({ localeCookie: 'en', sessionToken: 'test' }, async () => new Response(JSON.stringify({ id: 'account-a', locale: 'en-US' })))).toEqual({ locale: 'vi', userId: 'account-a' });
  });
});
