import { cache } from 'react';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, type UiLocale } from './locale';
import { translate, type Messages } from './translator';

interface ServerPreference { readonly locale: UiLocale; readonly userId: string | null }
export async function resolveServerPreference(input: { localeCookie?: string | undefined; sessionToken?: string | undefined }, fetcher: typeof fetch = fetch): Promise<ServerPreference> {
  const fallback = { locale: normalizeLocale(input.localeCookie), userId: null };
  if (!input.sessionToken) return fallback;
  try {
    const origin = process.env.WORKLINGO_API_URL ?? 'http://127.0.0.1:4000';
    const response = await fetcher(`${origin}/api/v1/me`, {
      cache: 'no-store', headers: { cookie: `worklingo_session=${encodeURIComponent(input.sessionToken)}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return fallback;
    const user: unknown = await response.json();
    if (typeof user !== 'object' || !user || !('id' in user) || typeof user.id !== 'string') return fallback;
    return { locale: normalizeLocale('locale' in user ? user.locale : undefined), userId: user.id };
  } catch { return fallback; }
}
export const getServerPreference = cache(async (): Promise<ServerPreference> => {
  const store = await cookies();
  return resolveServerPreference({ localeCookie: store.get(LOCALE_COOKIE)?.value, sessionToken: store.get('worklingo_session')?.value });
});
export async function getServerT<M extends Messages>(namespace: string, messages: M) {
  const { locale } = await getServerPreference();
  return translate(locale, namespace, messages);
}
