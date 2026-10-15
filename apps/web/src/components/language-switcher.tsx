'use client';

import { useId } from 'react';
import { useLocalePreference, useT } from '../i18n/provider';
import { isUiLocale } from '../i18n/locale';
import { commonMessages } from '../i18n/messages/common';
import './language-switcher.css';

export function LanguageSwitcher() {
  const id = useId();
  const t = useT('common', commonMessages);
  const { locale, setLocale, saving, error } = useLocalePreference();
  return <div className="language-control">
    <label htmlFor={id} className="visually-hidden">{t('language')}</label>
    <select id={id} value={locale} aria-busy={saving} aria-describedby={error ? `${id}-error` : undefined}
      onChange={(event) => { if (isUiLocale(event.target.value)) void setLocale(event.target.value); }}>
      <option value="vi" lang="vi" translate="no">Tiếng Việt</option><option value="en" lang="en" translate="no">English</option>
    </select>
    <span className="visually-hidden" aria-live="polite" role={saving ? 'status' : undefined}>{saving ? t('savingLanguage') : ''}</span>
    {error ? <span className="language-error" role="alert" id={`${id}-error`}>{error}</span> : null}
  </div>;
}
