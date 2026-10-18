'use client';

import { useSyncExternalStore } from 'react';
import { englishVoiceRegistry, VoiceRotationManager, type BrowserVoice } from './voice-registry';

interface RegistrySnapshot {
  readonly supported: boolean;
  readonly voices: readonly BrowserVoice[];
  readonly disabledIds: ReadonlySet<string>;
  readonly rotationEnabled: boolean;
}

const EMPTY: RegistrySnapshot = { supported: false, voices: [], disabledIds: new Set(), rotationEnabled: true };

class BrowserVoiceStore {
  readonly rotation = new VoiceRotationManager();
  private snapshot: RegistrySnapshot = EMPTY;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly synthesis: SpeechSynthesis) {
    this.snapshot = { ...EMPTY, supported: true, voices: englishVoiceRegistry(synthesis.getVoices()) };
  }

  getSnapshot = () => this.snapshot;

  private emit() { this.listeners.forEach((listener) => listener()); }

  refresh = () => {
    this.snapshot = { ...this.snapshot, voices: englishVoiceRegistry(this.synthesis.getVoices()) };
    this.emit();
  };

  subscribe = (listener: () => void) => {
    if (this.listeners.size === 0) this.synthesis.addEventListener('voiceschanged', this.refresh);
    this.listeners.add(listener);
    this.refresh();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.synthesis.removeEventListener('voiceschanged', this.refresh);
    };
  };

  setEnabled = (id: string, enabled: boolean) => {
    const disabledIds = new Set(this.snapshot.disabledIds);
    if (enabled) disabledIds.delete(id);
    else disabledIds.add(id);
    this.snapshot = { ...this.snapshot, disabledIds };
    this.emit();
  };

  setRotation = (rotationEnabled: boolean) => {
    this.snapshot = { ...this.snapshot, rotationEnabled };
    this.emit();
  };
}

const stores = new WeakMap<SpeechSynthesis, BrowserVoiceStore>();
const subscribeUnsupported = () => () => {};
const getEmpty = () => EMPTY;

export function useVoiceRegistry() {
  const supported = typeof window !== 'undefined'
    && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined';
  let store: BrowserVoiceStore | undefined;
  if (supported) {
    store = stores.get(window.speechSynthesis);
    if (!store) {
      store = new BrowserVoiceStore(window.speechSynthesis);
      stores.set(window.speechSynthesis, store);
    }
  }
  const snapshot = useSyncExternalStore(store?.subscribe ?? subscribeUnsupported, store?.getSnapshot ?? getEmpty, getEmpty);
  return { ...snapshot, store };
}
