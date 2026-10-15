'use client';

import { useT } from '../../i18n/provider';
import { audioMessages } from '../../i18n/messages/audio';

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
  readonly preferBrowserSpeech?: boolean;
  readonly text: string;
}) {
  const t = useT('audio', audioMessages);
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
    return <p className="audio-fallback-notice" role="status">{t('loadingPreferences')}</p>;
  }

  if (
    settings.sourceId === 'browser-tts'
    || (props.preferBrowserSpeech && settings.sourceId !== 'published-audio')
  ) {
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
          {t('publishedUnavailable')}
        </p>
      );
    }
    return (
      <div className="audio-browser-fallback">
        <p className="audio-fallback-notice" role="status">
          {t('lessonUnavailable')}
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
      aria-label={t('lessonAudio')}
      controls
      onError={() => setMediaFailed(true)}
      preload="metadata"
      src={props.audioUrl}
    >
      {t('playbackUnsupported')}
    </audio>
  );
}
