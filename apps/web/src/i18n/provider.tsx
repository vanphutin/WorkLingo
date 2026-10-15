'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_EVENT_KEY, isUiLocale, normalizeLocale, type UiLocale } from './locale';
import { commonMessages } from './messages/common';
import { translate, type Messages, type Translator } from './translator';

interface LocaleUser { readonly id: string; readonly locale?: unknown }
interface LocalePreference {
  readonly locale: UiLocale;
  readonly saving: boolean;
  readonly error: string | null;
  readonly setLocale: (locale: UiLocale) => Promise<void>;
  readonly synchronizeUser: (user: LocaleUser) => void;
  readonly clearUser: () => void;
}
const LocaleContext = createContext<LocalePreference | null>(null);
const isolatedPreference: LocalePreference = { locale: 'en', saving: false, error: null, setLocale: async () => undefined, synchronizeUser: () => undefined, clearUser: () => undefined };

function writeCookie(locale: UiLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
function publish(userId: string | null, locale: UiLocale) {
  try { localStorage.setItem(LOCALE_EVENT_KEY, JSON.stringify({ userId, locale, nonce: Date.now() })); } catch { /* Cookie remains usable when storage is unavailable. */ }
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE, initialUserId = null }: {
  readonly children: ReactNode; readonly initialLocale?: UiLocale; readonly initialUserId?: string | null;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const account = useRef(initialUserId);
  const generation = useRef(0);
  const localeRef = useRef(initialLocale);
  const persistedLocale = useRef(initialLocale);
  const savingRef = useRef(false);
  const transitioningAccount = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const apply = useCallback((next: UiLocale) => {
    localeRef.current = next;
    updateLocale(next);
    document.documentElement.lang = next;
    writeCookie(next);
  }, []);
  const synchronizeUser = useCallback((user: LocaleUser) => {
    if (account.current === user.id) return; // Do not overwrite a pending explicit switch with a stale /me response.
    generation.current += 1;
    account.current = user.id;
    transitioningAccount.current = false;
    persistedLocale.current = normalizeLocale(user.locale);
    savingRef.current = false;
    setSaving(false);
    setFailed(false);
    apply(normalizeLocale(user.locale));
  }, [apply]);
  const clearUser = useCallback(() => {
    generation.current += 1;
    account.current = null;
    transitioningAccount.current = false;
    savingRef.current = false;
    setSaving(false);
    setFailed(false);
    publish(null, localeRef.current);
  }, []);

  const setLocale = useCallback(async (next: UiLocale) => {
    if (!isUiLocale(next) || transitioningAccount.current) return;
    const userId = account.current;
    const stamp = ++generation.current;
    apply(next);
    setFailed(false);
    if (!userId) { persistedLocale.current = next; publish(null, next); return; }
    savingRef.current = true;
    setSaving(true);
    // Serialize writes so rapid selections cannot finish out of order in the database.
    const operation = queue.current.catch(() => undefined).then(async () => {
      if (account.current !== userId) return;
      const response = await fetch('/api/v1/me/preferences', {
        method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json', 'x-worklingo-account-id': userId }, body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) throw new Error('Preference update failed');
      const result: unknown = await response.json();
      if (typeof result !== 'object' || !result || !('locale' in result) || result.locale !== next) throw new Error('Invalid preference response');
      if (account.current === userId) persistedLocale.current = next;
      if (generation.current === stamp && account.current === userId) publish(userId, next);
    });
    queue.current = operation;
    try { await operation; }
    catch {
      if (generation.current === stamp && account.current === userId) { apply(persistedLocale.current); publish(userId, persistedLocale.current); setFailed(true); }
    } finally {
      if (generation.current === stamp) { savingRef.current = false; setSaving(false); }
    }
  }, [apply]);

  useEffect(() => {
    document.documentElement.lang = localeRef.current;
    writeCookie(localeRef.current);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCALE_EVENT_KEY || !event.newValue) return;
      try {
        const value: unknown = JSON.parse(event.newValue);
        if (typeof value !== 'object' || !value || !('userId' in value) || !('locale' in value)) return;
        if (value.userId !== account.current || !isUiLocale(value.locale)) return;
        if (savingRef.current) return;
        generation.current += 1;
        persistedLocale.current = value.locale;
        setSaving(false);
        setFailed(false);
        apply(value.locale);
      } catch { /* Ignore malformed cross-tab events. */ }
    };
    const onFocus = async () => {
      const userId = account.current;
      const stamp = generation.current;
      if (!userId || savingRef.current) return;
      try {
        const response = await fetch('/api/v1/me', { credentials: 'include', cache: 'no-store' });
        if (response.status === 401 && generation.current === stamp && account.current === userId) {
          clearUser();
          window.dispatchEvent(new Event('worklingo-account-changed'));
          return;
        }
        if (!response.ok) return;
        const user: unknown = await response.json();
        if (typeof user !== 'object' || !user || !('id' in user) || !('locale' in user)) return;
        if (generation.current !== stamp || account.current !== userId || savingRef.current) return;
        if (user.id !== userId) {
          // Account data and locale must transition together. The app root reloads this workspace.
          transitioningAccount.current = true;
          window.dispatchEvent(new Event('worklingo-account-changed'));
          return;
        }
        if (isUiLocale(user.locale)) { persistedLocale.current = user.locale; apply(user.locale); }
      } catch { /* Retain the current language while offline. */ }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, [apply, clearUser]);

  const value = useMemo<LocalePreference>(() => ({ locale, saving, error: failed ? translate(locale, 'common', commonMessages)('preferenceError') : null,
    setLocale, synchronizeUser, clearUser }), [locale, saving, failed, setLocale, synchronizeUser, clearUser]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocalePreference(): LocalePreference {
  const value = useContext(LocaleContext);
  if (value) return value;
  // Isolated component tests/embeds explicitly retain legacy English; the app root always provides vi by default.
  return isolatedPreference;
}
export function useT<M extends Messages>(namespace: string, messages: M): Translator<M> {
  const { locale } = useLocalePreference();
  return useMemo(() => translate(locale, namespace, messages), [locale, namespace, messages]);
}
