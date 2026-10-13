'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  readonly preferredVoiceId?: string | null;
  readonly rate?: number;
  readonly text: string;
  readonly volume?: number;
}): BrowserSpeechController {
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof SpeechSynthesisUtterance !== 'undefined';
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>(() =>
    supported ? window.speechSynthesis.getVoices() : [],
  );
  const [status, setStatus] = useState<BrowserSpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    const updateVoices = () => setVoices(synthesis.getVoices());
    updateVoices();
    synthesis.addEventListener('voiceschanged', updateVoices);
    return () => synthesis.removeEventListener('voiceschanged', updateVoices);
  }, [supported]);

  const resolvedVoice = useMemo(() => {
    const preferred = voices.find((voice) =>
      voice.voiceURI === input.preferredVoiceId || voice.name === input.preferredVoiceId,
    );
    return preferred
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
      ?? null;
  }, [input.preferredVoiceId, voices]);

  const stop = useCallback(() => {
    if (!supported) return;
    activeUtterance.current = null;
    window.speechSynthesis.cancel();
    setStatus('idle');
    setError(null);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) {
        activeUtterance.current = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [input.lang, input.preferredVoiceId, input.rate, input.text, input.volume, supported]);

  const play = useCallback(() => {
    if (!supported) {
      setError('Browser speech is not supported on this device.');
      setStatus('error');
      return;
    }
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(input.text);
    utterance.lang = input.lang;
    utterance.rate = input.rate ?? 1;
    utterance.volume = input.volume ?? 1;
    utterance.voice = resolvedVoice;
    activeUtterance.current = utterance;
    utterance.onend = () => {
      if (activeUtterance.current !== utterance) return;
      activeUtterance.current = null;
      setStatus('idle');
    };
    utterance.onerror = () => {
      if (activeUtterance.current !== utterance) return;
      activeUtterance.current = null;
      setError('The browser could not speak this text. Try another voice.');
      setStatus('error');
    };
    setError(null);
    setStatus('speaking');
    synthesis.speak(utterance);
  }, [input.lang, input.rate, input.text, input.volume, resolvedVoice, supported]);

  const pauseOrResume = useCallback(() => {
    if (!supported || status === 'idle' || status === 'error') return;
    if (status === 'paused' || window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('speaking');
      return;
    }
    window.speechSynthesis.pause();
    setStatus('paused');
  }, [status, supported]);

  return {
    error,
    pauseOrResume,
    play,
    resolvedVoice,
    status,
    stop,
    supported,
    voices,
  };
}
