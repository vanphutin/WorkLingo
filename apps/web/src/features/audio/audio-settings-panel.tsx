'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { audioMessages } from '../../i18n/messages/audio';

import { useCallback, useEffect, useState } from 'react';
import type { AudioSettings, AudioSourceId } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { BrowserSpeechControls } from './browser-speech-controls';
import { useBrowserSpeech } from './use-browser-speech';
import './preferences-experience.css';

const PREVIEW_TEXT = 'Could you share the updated project timeline with the team?';


export function AudioSettingsPanel() {
  const t = useT('audio', audioMessages);
  const { locale } = useLocalePreference();
  const SOURCES: ReadonlyArray<{
    description: string;
    id: AudioSourceId;
    label: string;
  }> = [
    {
      description: t('automaticDescription'),
      id: 'system-default', label: t('automatic'),
    },
    {
      description: t('publishedDescription'),
      id: 'published-audio', label: t('publishedAudio'),
    },
    {
      description: t('browserDescription'),
      id: 'browser-tts', label: t('browserVoice'),
    },
  ];
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [loadError, setLoadError] = useState<{ cause: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<{ cause: unknown } | null>(null);
  const speech = useBrowserSpeech({
    lang: 'en-US', preferredVoiceId: settings?.browserVoiceId ?? null, text: PREVIEW_TEXT,
  });

  const load = useCallback(async () => {
    setLoadError(null);
    setSaved(false);
    try {
      setSettings(await audioSettingsClient.getLearnerSettings());
    } catch (cause) {
      setLoadError({ cause });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loadError) {
    return (
      <section className="audio-settings-state preferences-experience" aria-labelledby="audio-settings-title">
        <h1 id="audio-settings-title">{t('audioSettings')}</h1>
        <div role="alert">
          <p>{t('learnerLoadError')}</p>
          <p>{localizedError(loadError.cause, locale)}</p>
          <button type="button" onClick={() => void load()}>{t('retry')}</button>
        </div>
      </section>
    );
  }
  if (!settings) return <p className="audio-settings-state preferences-experience" role="status">{t('loadingSettings')}</p>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      setSettings(await audioSettingsClient.updateLearnerSettings(settings));
      setSaved(true);
    } catch (cause) {
      setSaveError({ cause });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="audio-settings-panel preferences-experience" aria-labelledby="audio-settings-title">
      <header>
        <p className="eyebrow">{t('playback')}</p>
        <h1 id="audio-settings-title">{t('audioSettings')}</h1>
        <p>{t('settingsDescription')}</p>
      </header>

      <fieldset className="audio-source-list">
        <legend>{t('preferredSource')}</legend>
        {SOURCES.map((source) => (
          <label className="audio-source-option" key={source.id}>
            <input
              checked={settings.sourceId === source.id}
              name="audio-source"
              type="radio"
              value={source.id}
              onChange={() => setSettings((current) => current && ({
                ...current, sourceId: source.id,
              }))}
            />
            <span><strong>{source.label}</strong><small>{source.description}</small></span>
          </label>
        ))}
      </fieldset>

      {settings.sourceId === 'browser-tts' ? (
        <div className="audio-voice-settings">
          <label htmlFor="browser-voice">{t('deviceVoice')}</label>
          <select
            className="audio-settings-select"
            id="browser-voice"
            name="browser-voice"
            value={settings.browserVoiceId ?? ''}
            onChange={(event) => setSettings((current) => current && ({
              ...current, browserVoiceId: event.target.value || null,
            }))}
          >
            <option value="">{t('automaticVoice')}</option>
            {speech.voices.filter((voice) => voice.lang.toLowerCase().startsWith('en')).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
            ))}
          </select>
          <p className="audio-preview-sentence"><span>{t('testSentence')}</span> “<span lang="en">{PREVIEW_TEXT}</span>”</p>
          <BrowserSpeechControls
            lang="en-US"
            preferredVoiceId={settings.browserVoiceId}
            text={PREVIEW_TEXT}
          />
        </div>
      ) : null}

      <div className="audio-settings-footer">
        <button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? t('saving') : t('saveAudio')}
        </button>
        {saved ? <p role="status">{t('audioSaved')}</p> : null}
        {saveError ? <p className="field-error" role="alert">{localizedError(saveError.cause, locale)}</p> : null}
      </div>
    </section>
  );
}
