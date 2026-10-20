'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { parseDialogue } from '@worklingo/content-format';
import { useT } from '../../i18n/provider';
import { audioMessages } from '../../i18n/messages/audio';
import { playbackOwnership, subscribeNativeMedia } from './playback-owner';
import { useVoiceRegistry } from './use-voice-registry';
import { browserVoiceGender, planBrowserSpeech, type SpeechPlanError } from './voice-registry';

export type BrowserSpeechStatus = 'idle' | 'speaking' | 'paused' | 'error';

export interface BrowserSpeechController {
  readonly error: string | null;
  readonly resolvedVoice: SpeechSynthesisVoice | null;
  readonly status: BrowserSpeechStatus;
  readonly supported: boolean;
  readonly voices: readonly SpeechSynthesisVoice[];
  pauseOrResume(): void;
  play(): void;
  stop(): void;
}

export function useBrowserSpeech(input: {
  readonly lang: string;
  readonly dialogue?: boolean;
  readonly itemId?: string;
  readonly sessionId?: string;
  readonly preferredVoiceId?: string | null;
  readonly rate?: number;
  readonly text: string;
  readonly volume?: number;
  readonly onPlaybackComplete?: (() => void) | undefined;
}): BrowserSpeechController {
  const t = useT('audio', audioMessages);
  const { voices, disabledIds, rotationEnabled, store, supported } = useVoiceRegistry();
  const [status, setStatus] = useState<BrowserSpeechStatus>('idle');
  const [errorKey, setError] = useState<SpeechPlanError | 'speechUnsupported' | 'speechError' | 'speechBlocked' | null>(null);
  const [errorCode, setErrorCode] = useState('unknown');
  const [playingVoice, setPlayingVoice] = useState<SpeechSynthesisVoice | null>(null);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const paused = useRef(false);
  const pendingTurn = useRef<(() => void) | null>(null);
  const owner = useRef(Symbol('browser-speech'));
  const onPlaybackComplete = useRef(input.onPlaybackComplete);
  useEffect(() => { onPlaybackComplete.current = input.onPlaybackComplete; }, [input.onPlaybackComplete]);
  const instance = useId();
  const item = JSON.stringify([
    input.sessionId ?? null, input.itemId ?? instance,
    input.itemId ? null : input.text, input.lang,
  ]);
  const eligible = voices.filter((entry) => !disabledIds.has(entry.id));
  const resolvedVoice = playingVoice
    ?? store?.rotation.resolve(item, eligible, input.preferredVoiceId, rotationEnabled)?.voice ?? null;

  useEffect(subscribeNativeMedia, []);

  const stop = useCallback(() => {
    playbackOwnership.stop(owner.current);
    setPlayingVoice(null);
    setStatus('idle');
    setError(null);
  }, []);

  useEffect(() => {
    const token = owner.current;
    setPlayingVoice(null);
    return () => { playbackOwnership.stop(token); };
  }, [input.dialogue, input.lang, input.preferredVoiceId, input.rate, input.text, input.volume, item, supported]);

  const play = useCallback(() => {
    if (!supported || !store) {
      setError('speechUnsupported');
      setStatus('error');
      return;
    }
    // Refresh at the user gesture too: not every browser emits voiceschanged.
    store.refresh();
    const current = store.getSnapshot();
    const enabled = current.voices.filter((entry) => !current.disabledIds.has(entry.id));
    const plan = planBrowserSpeech(
      parseDialogue(input.text, { forceDialogue: input.dialogue === true }),
      /^en(?:[-_]|$)/iu.test(input.lang) ? enabled : [],
      store.rotation, item, input.preferredVoiceId, current.rotationEnabled,
    );
    if (plan.error) {
      playbackOwnership.stop(owner.current);
      setError(plan.error);
      setStatus('error');
      return;
    }
    const synthesis = window.speechSynthesis;
    const token = owner.current;
    let live = true;
    playbackOwnership.claim(token, () => {
      live = false;
      activeUtterance.current = null;
      pendingTurn.current = null;
      paused.current = false;
      synthesis.cancel();
      setPlayingVoice(null);
      setStatus('idle');
      setError(null);
    });
    paused.current = false;
    const finish = (code: string | null, completed = false) => {
      if (!live || !playbackOwnership.owns(token)) return;
      live = false;
      activeUtterance.current = null;
      pendingTurn.current = null;
      playbackOwnership.finish(token);
      setErrorCode(code ?? 'unknown');
      setError(code === 'not-allowed' ? 'speechBlocked' : code ? 'speechError' : null);
      setStatus(code ? 'error' : 'idle');
      if (completed) onPlaybackComplete.current?.();
    };
    const assignments = new Map(plan.turns.map(turn => [turn.key, turn.voice]));
    const next = (index: number, attempted = new Set<string>()) => {
      if (!live || !playbackOwnership.owns(token)) return;
      if (paused.current) { pendingTurn.current = () => next(index, attempted); return; }
      const turn = plan.turns[index];
      if (!turn) { finish(null, plan.turns.length > 0); return; }
      const voice = assignments.get(turn.key)!;
      attempted.add(voice.id);
      const utterance = new SpeechSynthesisUtterance(turn.text);
      utterance.lang = voice.locale;
      utterance.rate = input.rate ?? 1;
      utterance.volume = input.volume ?? 1;
      utterance.voice = voice.voice;
      activeUtterance.current = utterance;
      setPlayingVoice(voice.voice);
      store.rotation.remember(turn.key, voice, turn.preference);
      let started = false;
      const isCurrent = () => live && activeUtterance.current === utterance && playbackOwnership.owns(token);
      utterance.onstart = () => { if (isCurrent()) started = true; };
      utterance.onend = () => {
        if (!isCurrent()) return;
        activeUtterance.current = null;
        next(index + 1);
      };
      utterance.onerror = (event) => {
        if (!isCurrent()) return;
        const code = event?.error ?? 'unknown';
        const recoverable = ['network', 'voice-unavailable', 'language-unavailable', 'synthesis-failed', 'synthesis-unavailable'].includes(code);
        if (!started && recoverable && attempted.size < 3) {
          const latest = store.getSnapshot();
          const reserved = new Set([...assignments].filter(([key]) => key !== turn.key).map(([, selected]) => selected.id));
          const fallback = latest.voices
            .filter(v => !latest.disabledIds.has(v.id) && !attempted.has(v.id) && !reserved.has(v.id)
              && (!turn.speaker?.gender || browserVoiceGender(v.voice) === turn.speaker.gender))
            .sort((a, b) => Number(b.localService) - Number(a.localService))[0];
          if (fallback) {
            // Invalidate before cancel: some engines dispatch cancellation immediately.
            activeUtterance.current = null;
            synthesis.cancel();
            assignments.set(turn.key, fallback);
            store.rotation.remember(turn.key, fallback, turn.preference, true);
            next(index, attempted);
            return;
          }
        }
        finish(code === 'canceled' || code === 'interrupted' ? null : code);
      };
      try {
        if (synthesis.paused) synthesis.resume();
        synthesis.speak(utterance);
      } catch { finish('synthesis-failed'); }
    };
    setError(null);
    setStatus('speaking');
    next(0);
  }, [input.dialogue, input.lang, input.preferredVoiceId, input.rate, input.text, input.volume, item, store, supported]);

  const pauseOrResume = useCallback(() => {
    if (!supported || !playbackOwnership.owns(owner.current) || status === 'idle' || status === 'error') return;
    if (status === 'paused' || window.speechSynthesis.paused) {
      paused.current = false;
      window.speechSynthesis.resume();
      setStatus('speaking');
      const next = pendingTurn.current;
      pendingTurn.current = null;
      next?.();
    } else {
      paused.current = true;
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, [status, supported]);

  return {
    error: errorKey ? t(errorKey, { code: errorCode }) : null, pauseOrResume, play, resolvedVoice,
    status, stop, supported, voices: voices.map((entry) => entry.voice),
  };
}
