'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AudioSettings, AudioSourceId } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { BrowserSpeechControls } from './browser-speech-controls';
import { useBrowserSpeech } from './use-browser-speech';

const PREVIEW_TEXT = 'Could you share the updated project timeline with the team?';
const SOURCES: ReadonlyArray<{
  description: string;
  id: AudioSourceId;
  label: string;
}> = [
  {
    description: 'Use lesson audio first, then offer browser speech if playback fails.',
    id: 'system-default', label: 'Automatic',
  },
  {
    description: 'Use only the audio selected and published with the lesson.',
    id: 'published-audio', label: 'Published lesson audio',
  },
  {
    description: 'Read lesson text using a voice installed in this browser.',
    id: 'browser-tts', label: 'Browser voice',
  },
];

export function AudioSettingsPanel() {
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const speech = useBrowserSpeech({
    lang: 'en-US', preferredVoiceId: settings?.browserVoiceId ?? null, text: PREVIEW_TEXT,
  });

  const load = useCallback(async () => {
    setLoadError(false);
    setSaved(false);
    try {
      setSettings(await audioSettingsClient.getLearnerSettings());
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loadError) {
    return (
      <section className="audio-settings-state" aria-labelledby="audio-settings-title">
        <h1 id="audio-settings-title">Audio settings</h1>
        <div role="alert">
          <p>We could not load your audio settings. Your learning pages can still use automatic playback.</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </div>
      </section>
    );
  }
  if (!settings) return <p className="audio-settings-state" role="status">Loading audio settings…</p>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(false);
    try {
      setSettings(await audioSettingsClient.updateLearnerSettings(settings));
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="audio-settings-panel" aria-labelledby="audio-settings-title">
      <header>
        <p className="eyebrow">Playback</p>
        <h1 id="audio-settings-title">Audio settings</h1>
        <p>Choose how WorkLingo plays English in lessons. Nothing starts without your action.</p>
      </header>

      <fieldset className="audio-source-list">
        <legend>Preferred audio source</legend>
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
          <label htmlFor="browser-voice">Voice on this device</label>
          <select
            className="audio-settings-select"
            id="browser-voice"
            name="browser-voice"
            value={settings.browserVoiceId ?? ''}
            onChange={(event) => setSettings((current) => current && ({
              ...current, browserVoiceId: event.target.value || null,
            }))}
          >
            <option value="">Automatic English voice</option>
            {speech.voices.filter((voice) => voice.lang.toLowerCase().startsWith('en')).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
            ))}
          </select>
          <p className="audio-preview-sentence">Test sentence: “{PREVIEW_TEXT}”</p>
          <BrowserSpeechControls
            lang="en-US"
            preferredVoiceId={settings.browserVoiceId}
            text={PREVIEW_TEXT}
          />
        </div>
      ) : null}

      <div className="audio-settings-footer">
        <button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save audio settings'}
        </button>
        {saved ? <p role="status">Audio settings saved.</p> : null}
        {saveError ? <p className="field-error" role="alert">Could not save. Try again.</p> : null}
      </div>
    </section>
  );
}
