'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminAudioSettings } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';

export function AdminAudioSettingsPanel() {
  const [settings, setSettings] = useState<AdminAudioSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      setSettings(await audioSettingsClient.getAdminSettings());
    } catch {
      setLoadError(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loadError) {
    return (
      <section className="audio-settings-state" aria-labelledby="admin-audio-settings-title">
        <h1 id="admin-audio-settings-title">Audio generation settings</h1>
        <div role="alert">
          <p>Provider readiness is temporarily unavailable.</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </div>
      </section>
    );
  }
  if (!settings) return <p className="audio-settings-state" role="status">Loading provider settings…</p>;

  const selected = settings.providers.find((provider) => provider.id === settings.providerId);
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      setSettings(await audioSettingsClient.updateAdminSettings({
        defaultVoiceId: settings.defaultVoiceId,
        providerId: settings.providerId,
      }));
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="audio-settings-panel" aria-labelledby="admin-audio-settings-title">
      <header>
        <p className="eyebrow">Generation</p>
        <h1 id="admin-audio-settings-title">Audio generation settings</h1>
        <p>Set non-secret defaults for future audio candidates. Existing releases do not change.</p>
      </header>
      <fieldset className="audio-source-list">
        <legend>Text to speech provider</legend>
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
              <strong>{provider.displayName}</strong>
              <small>{provider.available
                ? provider.simulation ? 'Available for local simulation' : 'Configured and available'
                : 'Unavailable until configured on the server'}</small>
            </span>
          </label>
        ))}
      </fieldset>
      {selected ? (
        <div className="audio-voice-settings">
          <label htmlFor="server-voice">Default server voice</label>
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
              {selected.defaultVoiceId ?? 'Provider default'}
            </option>
          </select>
          {selected.simulation ? (
            <p className="audio-settings-warning">Simulation audio is for local review, not release voice quality.</p>
          ) : null}
        </div>
      ) : null}
      <div className="audio-settings-footer">
        <button type="button" disabled={saving || !selected?.available} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save provider settings'}
        </button>
        {saved ? <p role="status">Provider settings saved.</p> : null}
        {saveError ? <p className="field-error" role="alert">Could not save. Try again.</p> : null}
      </div>
    </section>
  );
}
