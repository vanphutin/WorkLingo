'use client';

import type { PlaybackLeaseDto } from '@worklingo/contracts';
import { useEffect, useRef, useState } from 'react';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsMockMessages } from '../../i18n/messages/ieltsMock';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';

export function MockAudioPlayer({ attemptId, assetId, part, strict, paused }: { readonly attemptId: string; readonly assetId: string; readonly part: number; readonly strict: boolean; readonly paused: boolean }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const audio = useRef<HTMLAudioElement>(null);
  const clientPlayId = useRef<string | null>(null);
  const lease = useRef<PlaybackLeaseDto | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    if (!strict) { setReady(true); return; }
    void ieltsMockClient.currentPlayback(attemptId, assetId).then(value => {
      if (!active) return;
      lease.current = value; if (value) { if (audio.current) audio.current.src = value.streamUrl; setUrl(value.streamUrl); } setReady(true);
    }).catch(cause => { if (active) { setError(cause); setReady(true); } });
    return () => { active = false; };
  }, [attemptId, assetId, strict]);
  useEffect(() => { if (paused) audio.current?.pause(); }, [paused]);
  const play = async () => {
    setBusy(true); setError(null);
    try {
      if (strict && lease.current) {
        const restored = await ieltsMockClient.currentPlayback(attemptId, assetId);
        if (restored) lease.current = restored;
      }
      if (!lease.current) {
        clientPlayId.current ??= crypto.randomUUID();
        lease.current = await ieltsMockClient.playback(attemptId, assetId, clientPlayId.current);
      }
      const element = audio.current;
      if (!element) return;
      const current = lease.current;
      element.src = current.streamUrl; setUrl(current.streamUrl);
      element.playbackRate = 1;
      // A restored strict lease resumes at its server elapsed position, never from zero.
      element.onloadedmetadata = () => {
        if (strict && current.remainingSeconds >= 0 && Number.isFinite(element.duration)) element.currentTime = Math.max(0, element.duration - current.remainingSeconds);
      };
      await element.play();
      if(strict) lease.current=await ieltsMockClient.activatePlayback(attemptId,assetId,current.id);
      setPlaying(true);
    } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  return <section aria-label={t('listeningPart', { part })}>
    <audio ref={audio} controls={!strict && !!url && !paused} onPlay={event=>{if(paused)event.currentTarget.pause();}} preload="none" onEnded={() => { setPlaying(false); if (strict) setEnded(true); }} onError={() => { setPlaying(false); setError(new Error(t('audioRetry'))); }} />
    {ended ? <p>{t('listeningComplete', { part })}</p> : <button type="button" disabled={!ready || busy || paused || (strict && playing)} onClick={() => void play()}>{t('playPart', { part })}</button>}
    {!strict && url ? <label>{t('audioSpeed')}<select aria-label={t('audioSpeed')} defaultValue="1" onChange={event => { if (audio.current) audio.current.playbackRate = Number(event.target.value); }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option></select></label> : null}
    {error ? <p role="alert">{localizedError(error, locale)}</p> : null}
  </section>;
}
