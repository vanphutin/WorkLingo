'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';
import { TRANSPARENCY_STORAGE_KEY } from '../lib/theme';
import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';

const CHANGE_EVENT = 'worklingo-transparency-change';

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

// Keep storage synchronization alive on every route, independently of settings UI.
export function TransparencySync() {
  useEffect(() => {
    const apply = (value: string | null) => {
      if (value === 'reduce') document.documentElement.dataset.reduceTransparency = 'true';
      else delete document.documentElement.dataset.reduceTransparency;
      window.dispatchEvent(new Event(CHANGE_EVENT));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TRANSPARENCY_STORAGE_KEY && event.key !== null) return;
      apply(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    // Recover changes made in another tab between the head script and hydration.
    try { apply(localStorage.getItem(TRANSPARENCY_STORAGE_KEY)); } catch { /* Keep the pre-paint fallback. */ }
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return null;
}

export function TransparencyControl() {
  const id = useId();
  const t = useT('common', commonMessages);
  const reduced = useSyncExternalStore(subscribe,
    () => document.documentElement.dataset.reduceTransparency === 'true',
    () => false);
  return (
    <label className="transparency-control">
      <input type="checkbox" checked={reduced} aria-labelledby={`${id}-label`} aria-describedby={`${id}-description`}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          if (next) document.documentElement.dataset.reduceTransparency = 'true';
          else delete document.documentElement.dataset.reduceTransparency;
          try {
            if (next) localStorage.setItem(TRANSPARENCY_STORAGE_KEY, 'reduce');
            else localStorage.removeItem(TRANSPARENCY_STORAGE_KEY);
          } catch { /* The in-page preference remains usable when storage is blocked. */ }
          window.dispatchEvent(new Event(CHANGE_EVENT));
        }} />
      <span><strong id={`${id}-label`}>{t('reduceTransparency')}</strong>
        <small id={`${id}-description`}>{t('reduceTransparencyDescription')}</small></span>
    </label>
  );
}
