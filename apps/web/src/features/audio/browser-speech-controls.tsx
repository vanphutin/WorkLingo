'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { audioMessages } from '../../i18n/messages/audio';

import { formatNumber } from '../../i18n/translator';
import { useState } from 'react';
import { useBrowserSpeech } from './use-browser-speech';

export function BrowserSpeechControls(props: {
  readonly lang: string;
  readonly dialogue?: boolean;
  readonly itemId?: string;
  readonly sessionId?: string;
  readonly preferredVoiceId?: string | null;
  readonly onPlaybackComplete?: (() => void) | undefined;
  readonly text: string;
}) {
  const t = useT('audio', audioMessages);
  const { locale } = useLocalePreference();
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const speech = useBrowserSpeech({ ...props, rate, volume });
  if (!speech.supported) {
    return (
      <div className="audio-speech-controls">
        <p className="audio-settings-note">{t('speechUnsupported')}</p>
        <div className="audio-settings-actions">
          <button type="button" disabled>{t('playPreview')}</button>
          <button type="button" disabled>{t('stop')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-speech-controls">
      <div className="audio-settings-actions">
        <button type="button" onClick={speech.play}>
          {speech.status === 'speaking' ? t('restartPreview') : t('playPreview')}
        </button>
        <button
          className="secondary-action-button"
          type="button"
          disabled={speech.status === 'idle' || speech.status === 'error'}
          onClick={speech.pauseOrResume}
        >
          {speech.status === 'paused' ? t('resume') : t('pause')}
        </button>
        <button
          className="secondary-action-button"
          type="button"
          disabled={speech.status === 'idle'}
          onClick={speech.stop}
        >
          {t('stop')}
        </button>
      </div>
      <div className="audio-settings-actions">
        <label>{t('speed')}<select value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.75">{formatNumber(locale, 0.75)}×</option><option value="1">{formatNumber(locale, 1)}×</option><option value="1.25">{formatNumber(locale, 1.25)}×</option><option value="1.5">{formatNumber(locale, 1.5)}×</option></select></label>
        <label>{t('volume')}<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
      </div>
      <p className="audio-settings-note" aria-live="polite">
        {speech.error ?? (
          speech.resolvedVoice
            ? t('usingVoice', { name: speech.resolvedVoice.name })
            : t('voicesUnavailable')
        )}
      </p>
    </div>
  );
}
