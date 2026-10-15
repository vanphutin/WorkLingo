'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY as STORAGE_KEY } from '../lib/theme';
import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';

const CHANGE_EVENT = 'worklingo-theme-change';
const THEMES = ['system', 'light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

function ThemeIcon({ theme }: { readonly theme: Theme }) {
  if (theme === 'light') {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>;
  }
  if (theme === 'dark') {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    if (event.newValue === 'light' || event.newValue === 'dark') {
      document.documentElement.dataset.theme = event.newValue;
    } else {
      delete document.documentElement.dataset.theme;
    }
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function ThemeControl() {
  const t = useT('common', commonMessages);
  const theme = useSyncExternalStore(subscribe,
    (): Theme => (document.documentElement.dataset.theme ?? 'system') as Theme,
    (): Theme => 'system');
  const label = t(({ system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const)[theme]);
  return (
    <button
      type="button"
      className="theme-control"
      aria-label={t('themeLabel', { theme: label })}
      title={t('themeTitle', { theme: label })}
      onClick={() => {
        const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!;
        if (next === 'system') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = next;
        try {
          if (next === 'system') localStorage.removeItem(STORAGE_KEY);
          else localStorage.setItem(STORAGE_KEY, next);
        } catch { /* Preference remains usable for this page when storage is blocked. */ }
        window.dispatchEvent(new Event(CHANGE_EVENT));
      }}
    >
      <ThemeIcon theme={theme} />
      <span className="visually-hidden">{t('themeTitle', { theme: label })}</span>
    </button>
  );
}
