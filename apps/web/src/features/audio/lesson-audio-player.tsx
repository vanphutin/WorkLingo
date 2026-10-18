'use client';

import { useT } from '../../i18n/provider';
import { audioMessages } from '../../i18n/messages/audio';

import { useEffect, useRef, useState } from 'react';
import type { AudioSettings } from '@worklingo/contracts';

import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { BrowserSpeechControls } from './browser-speech-controls';
import { claimMediaPlayback, stopMediaPlayback, subscribeNativeMedia } from './playback-owner';

const DEFAULT_SETTINGS: AudioSettings = {
  browserVoiceId: null,
  sourceId: 'system-default',
};

function LessonMedia(props: { readonly src: string; readonly onError: () => void }) {
  const t = useT('audio', audioMessages);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const media = audio.current;
    const unsubscribe = subscribeNativeMedia();
    return () => {
      if (media) stopMediaPlayback(media);
      unsubscribe();
    };
  }, []);

  return (
    <audio
      aria-label={t('lessonAudio')}
      ref={audio}
      controls
      onPlay={(event) => {
        claimMediaPlayback(event.currentTarget);
      }}
      onError={(event) => {
        stopMediaPlayback(event.currentTarget);
        props.onError();
      }}
      preload="metadata"
      src={props.src}
    >
      {t('playbackUnsupported')}
    </audio>
  );
}

export function LessonAudioPlayer(props: {
  readonly audioUrl: string;
  readonly dialogue?: boolean;
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
        itemId={props.audioUrl}
        dialogue={props.dialogue === true}
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
          itemId={props.audioUrl}
          dialogue={props.dialogue === true}
          lang="en-US"
          preferredVoiceId={settings.browserVoiceId}
          text={props.text}
        />
      </div>
    );
  }

  return (
    <LessonMedia
      key={props.audioUrl}
      onError={() => setMediaFailed(true)}
      src={props.audioUrl}
    />
  );
}
