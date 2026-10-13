'use client';

import { useState } from 'react';
import { useBrowserSpeech } from './use-browser-speech';

export function BrowserSpeechControls(props: {
  readonly lang: string;
  readonly preferredVoiceId?: string | null;
  readonly text: string;
}) {
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const speech = useBrowserSpeech({ ...props, rate, volume });
  if (!speech.supported) {
    return (
      <div className="audio-speech-controls">
        <p className="audio-settings-note">Browser speech is not supported on this device.</p>
        <div className="audio-settings-actions">
          <button type="button" disabled>Play preview</button>
          <button type="button" disabled>Stop</button>
        </div>
      </div>
    );
  }

  return (
    <div className="audio-speech-controls">
      <div className="audio-settings-actions">
        <button type="button" onClick={speech.play}>
          {speech.status === 'speaking' ? 'Restart preview' : 'Play preview'}
        </button>
        <button
          className="secondary-action-button"
          type="button"
          disabled={speech.status === 'idle' || speech.status === 'error'}
          onClick={speech.pauseOrResume}
        >
          {speech.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          className="secondary-action-button"
          type="button"
          disabled={speech.status === 'idle'}
          onClick={speech.stop}
        >
          Stop
        </button>
      </div>
      <div className="audio-settings-actions">
        <label>Speed<select value={rate} onChange={(event) => setRate(Number(event.target.value))}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
        <label>Volume<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
      </div>
      <p className="audio-settings-note" aria-live="polite">
        {speech.error ?? (
          speech.resolvedVoice
            ? `Using ${speech.resolvedVoice.name}`
            : 'Your browser will choose an English voice.'
        )}
      </p>
    </div>
  );
}
