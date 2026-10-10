'use client';

import { useEffect, useState } from 'react';
import type { AudioSettings } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { BrowserSpeechControls } from './browser-speech-controls';

const DEFAULT_SETTINGS: AudioSettings = {
  browserVoiceId: null,
  sourceId: 'system-default',
};

export function LessonAudioPlayer(props: {
  readonly audioUrl: string;
  readonly text: string;
}) {
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void audioSettingsClient.getLearnerSettings()
      .then((value) => { if (active) setSettings(value); })
      .catch(() => { if (active) setSettings(DEFAULT_SETTINGS); });
    return () => { active = false; };
  }, []);

  useEffect(() => setMediaFailed(false), [props.audioUrl]);

  if (!settings) {
    return <p className="audio-fallback-notice" role="status">Loading audio preferences…</p>;
  }

  if (settings.sourceId === 'browser-tts') {
    return (
      <BrowserSpeechControls
        lang="en-US"
        preferredVoiceId={settings.browserVoiceId}
        text={props.text}
      />
    );
  }

  if (mediaFailed) {
    if (settings.sourceId === 'published-audio') {
      return (
        <p className="audio-fallback-notice" role="alert">
          Published audio is unavailable. Use the transcript below or change your audio settings.
        </p>
      );
    }
    return (
      <div className="audio-browser-fallback">
        <p className="audio-fallback-notice" role="status">
          Lesson audio is unavailable. Browser speech is ready as a fallback.
        </p>
        <BrowserSpeechControls
          lang="en-US"
          preferredVoiceId={settings.browserVoiceId}
          text={props.text}
        />
      </div>
    );
  }

  return (
    <audio
      aria-label="Lesson audio"
      controls
      onError={() => setMediaFailed(true)}
      preload="metadata"
      src={props.audioUrl}
    >
      Your browser does not support lesson audio playback.
    </audio>
  );
}
