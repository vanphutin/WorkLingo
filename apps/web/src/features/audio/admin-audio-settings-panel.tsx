'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { audioMessages } from '../../i18n/messages/audio';

import { useCallback, useEffect, useState } from 'react';
import type { AdminAudioSettings } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';

export function AdminAudioSettingsPanel() {
  const t = useT('audio', audioMessages);
  const { locale } = useLocalePreference();
  const [settings, setSettings] = useState<AdminAudioSettings | null>(null);
  const [loadError, setLoadError] = useState<{ cause: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<{ cause: unknown } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setSettings(await audioSettingsClient.getAdminSettings());
    } catch (cause) {
      setLoadError({ cause });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loadError) {
    return (
      <section className="audio-settings-state" aria-labelledby="admin-audio-settings-title">
        <h1 id="admin-audio-settings-title">{t('generationSettings')}</h1>
        <div role="alert">
          <p>{t('providerLoadError')}</p>
          <p>{localizedError(loadError.cause, locale)}</p>
          <button type="button" onClick={() => void load()}>{t('retry')}</button>
        </div>
      </section>
    );
  }
  if (!settings) return <p className="audio-settings-state" role="status">{t('loadingProviders')}</p>;

  const selected = settings.providers.find((provider) => provider.id === settings.providerId);
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      setSettings(await audioSettingsClient.updateAdminSettings({
        defaultVoiceId: settings.defaultVoiceId,
        providerId: settings.providerId,
      }));
      setSaved(true);
    } catch (cause) {
      setSaveError({ cause });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="audio-settings-panel" aria-labelledby="admin-audio-settings-title">
      <header>
        <p className="eyebrow">{t('generation')}</p>
        <h1 id="admin-audio-settings-title">{t('generationSettings')}</h1>
        <p>{t('generationDescription')}</p>
      </header>
      <fieldset className="audio-source-list">
        <legend>{t('ttsProvider')}</legend>
        {settings.providers.map((provider) => (
          <label className="audio-source-option" key={provider.id}>
            <input
              checked={settings.providerId === provider.id}
              disabled={!provider.available}
              name="tts-provider"
              type="radio"
              value={provider.id}
              onChange={() => setSettings((current) => current && ({
                ...current,
                defaultVoiceId: provider.defaultVoiceId,
                providerId: provider.id,
              }))}
            />
            <span>
              <strong>{provider.simulation ? t('simulationAudio') : provider.displayName}</strong>
              <small>{provider.available
                ? provider.simulation ? t('simulationAvailable') : t('providerAvailable')
                : t('providerUnavailable')}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {selected ? (
        <div className="audio-voice-settings">
          <label htmlFor="server-voice">{t('serverVoice')}</label>
          <select
            className="audio-settings-select"
            id="server-voice"
            name="server-voice"
            value={settings.defaultVoiceId ?? ''}
            onChange={(event) => setSettings((current) => current && ({
              ...current, defaultVoiceId: event.target.value || null,
            }))}
          >
            <option value={selected.defaultVoiceId ?? ''}>
              {selected.defaultVoiceId ?? t('providerDefault')}
            </option>
          </select>
          {selected.simulation ? (
            <p className="audio-settings-warning">{t('simulationWarning')}</p>
          ) : null}
        </div>
      ) : null}
      <div className="audio-settings-footer">
        <button type="button" disabled={saving || !selected?.available} onClick={() => void save()}>
          {saving ? t('saving') : t('saveProvider')}
        </button>
        {saved ? <p role="status">{t('providerSaved')}</p> : null}
        {saveError ? <p className="field-error" role="alert">{localizedError(saveError.cause, locale)}</p> : null}
      </div>
    </section>
  );
}
