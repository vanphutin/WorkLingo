'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { AiSettings } from '@worklingo/contracts';
import { aiSettingsClient } from '../../lib/api/ai-settings-client';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { aiMessages } from '../../i18n/messages/ai';

export function AiSettingsPanel({ admin = false }: { readonly admin?: boolean }) {
  const t = useT('ai', aiMessages);
  const { locale } = useLocalePreference();
  const id = useId();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    void aiSettingsClient.get(admin).then(value => { if (active) setSettings(value); }).catch(cause => { if (active) setError({ cause }); });
    return () => { active = false; };
  }, [admin, revision]);
  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true); setError(null); setSaved(false);
    try { setSettings(await aiSettingsClient.update(admin, { preferredProvider: settings.preferredProvider, fallbackEnabled: settings.fallbackEnabled }, settings.accountId)); setSaved(true); }
    catch (cause) { setError({ cause }); }
    finally { setSaving(false); }
  }, [settings, admin]);
  if (!settings) return <section className="audio-settings-state">
    <h1>{t(admin ? 'systemTitle' : 'title')}</h1>
    {error ? <div role="alert"><p>{t('loadError')}</p><p>{localizedError(error.cause, locale)}</p><button type="button" onClick={() => setRevision(value => value + 1)}>{t('retry')}</button></div> : <p role="status">{t('loading')}</p>}
  </section>;
  const readOnly = !settings.routingEnabled || (admin && !settings.canManageSystem);
  return <section className="audio-settings-panel" aria-labelledby={`${id}-title`} aria-busy={saving}>
    <header><h1 id={`${id}-title`}>{t(admin ? 'systemTitle' : 'title')}</h1><p>{t(admin ? 'systemDescription' : 'description')}</p></header>
    {readOnly ? <p>{t(settings.routingEnabled ? 'readOnly' : 'routingDisabled')}</p> : null}
    {settings.simulation ? <p className="audio-settings-warning">{t('simulation')}</p> : null}
    <fieldset disabled={saving || readOnly} className="audio-voice-settings">
      <label htmlFor={`${id}-provider`}>{t('preferred')}</label>
      <select className="audio-settings-select" id={`${id}-provider`} value={settings.preferredProvider} onChange={event => { setSaved(false); setSettings({ ...settings, preferredProvider: event.target.value as AiSettings['preferredProvider'] }); }}>
        {!admin ? <option value="system-default">{t('automatic')}</option> : null}
        {settings.providers.map(provider => <option key={provider.id} value={provider.id} disabled={!provider.available}>{t(provider.id)} · {provider.model ?? t('unavailable')} · {t(provider.available ? 'available' : 'unavailable')}</option>)}
      </select>
      <label className="audio-source-option"><input type="checkbox" checked={settings.fallbackEnabled} onChange={event => { setSaved(false); setSettings({ ...settings, fallbackEnabled: event.target.checked }); }} /><span>{t('fallback')}</span></label>
      <p>{t('fallbackWarning')}</p>
      {!settings.systemFallbackEnabled ? <p className="audio-settings-warning">{t('policyDisabled')}</p> : null}
      <button type="button" className="primary-button" onClick={() => void save()}>{t(saving ? 'saving' : 'save')}</button>
    </fieldset>
    <p>{t('effective', { provider: t(settings.effectiveProvider) })}</p>
    <p>{t('tokenCap', { tokens: settings.maxOutputTokens })}</p>
    <p>{t('openaiOnly')}</p>
    <p>{t('calibration')}</p>
    {saved ? <p role="status">{t('saved')}</p> : null}
    {error ? <p role="alert">{localizedError(error.cause, locale)}</p> : null}
  </section>;
}
