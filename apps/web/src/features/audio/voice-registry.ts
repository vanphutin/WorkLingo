export interface BrowserVoice {
  readonly id: string;
  readonly displayName: string;
  readonly language: 'en';
  readonly locale: string;
  readonly localService: boolean;
  readonly default: boolean;
  readonly voice: SpeechSynthesisVoice;
}

export function browserVoiceId(voice: SpeechSynthesisVoice): string {
  // Preserve saved voiceURI preferences; some browsers omit the URI.
  return voice.voiceURI || `${voice.lang}:${voice.name}`;
}

// Web Speech exposes no gender field. Only identify explicit voice metadata or
// these known Windows/Azure English voices; never infer a character's gender.
export function browserVoiceGender(voice: SpeechSynthesisVoice): SpeakerGender | null {
  if (/\bfemale\b/iu.test(voice.name)) return 'female';
  if (/\bmale\b/iu.test(voice.name)) return 'male';
  const microsoft = /^Microsoft (David|Mark|Zira|Guy|Davis|Tony|Jenny|Aria|Sara|Ryan|Sonia)\b/iu.exec(voice.name);
  if (!microsoft) return null;
  return /^(Zira|Jenny|Aria|Sara|Sonia)$/iu.test(microsoft[1]!) ? 'female' : 'male';
}

export interface BrowserSpeechTurn {
  readonly text: string;
  readonly speaker: DialogueSpeaker | null;
  readonly voice: BrowserVoice;
  readonly key: string;
  readonly preference: string | null;
}

export type SpeechPlanError = 'voicesUnavailable' | 'dialogueInvalid' | 'dialogueGenderUnavailable' | 'dialogueVoicesUnavailable';

export function planBrowserSpeech(
  script: DialogueScript, voices: readonly BrowserVoice[], rotation: VoiceRotationManager,
  item: string, preferred?: string | null, rotate = true,
): { turns: BrowserSpeechTurn[]; error: SpeechPlanError | null } {
  const fail = (error: SpeechPlanError) => ({ turns: [], error });
  if (script.issues.length) return fail('dialogueInvalid');
  if (!voices.length || !script.turns.length) return fail('voicesUnavailable');
  const assigned = new Map<string, BrowserVoice>();
  const used = new Set<string>();
  const keyFor = (id: string | null) => id === null ? item : JSON.stringify([item, id]);
  const preferredVoice = voices.find(v => v.id === preferred || v.voice.name === preferred);
  // A global preference belongs to the first compatible character, not every
  // character. Other characters must keep their own saved/recovered bindings.
  const preferredSpeaker = script.speakers.find(s => !s.gender || !preferredVoice
    || browserVoiceGender(preferredVoice.voice) === s.gender)?.id;
  const preferenceFor = (id: string | null) => id === null || id === preferredSpeaker ? preferred ?? null : null;
  // Reserve scarce gender-matched voices before unspecified legacy speakers.
  const speakers = [...script.speakers].sort((a, b) => Number(!!b.gender) - Number(!!a.gender));
  for (const speaker of speakers) {
    const matching = speaker.gender ? voices.filter(v => browserVoiceGender(v.voice) === speaker.gender) : voices;
    const saved = rotation.getAssigned(keyFor(speaker.id), matching, preferenceFor(speaker.id));
    if (saved && !used.has(saved.id)) { assigned.set(speaker.id, saved); used.add(saved.id); }
  }
  for (const speaker of speakers) {
    if (assigned.has(speaker.id)) continue;
    const matching = speaker.gender ? voices.filter(v => browserVoiceGender(v.voice) === speaker.gender) : voices;
    if (!matching.length) return fail('dialogueGenderUnavailable');
    const available = matching.filter(v => !used.has(v.id));
    const selected = rotation.resolve(keyFor(speaker.id), available, preferenceFor(speaker.id), rotate);
    if (!selected) return fail('dialogueVoicesUnavailable');
    assigned.set(speaker.id, selected); used.add(selected.id);
  }
  const turns: BrowserSpeechTurn[] = [];
  for (const turn of script.turns) {
    const speaker = script.speakers.find(s => s.id === turn.speaker) ?? null;
    const voice = speaker ? assigned.get(speaker.id) : rotation.resolve(item, voices, preferred, rotate);
    if (!voice) return fail('voicesUnavailable');
    turns.push({ text: turn.text, speaker, voice, key: keyFor(turn.speaker), preference: preferenceFor(turn.speaker) });
  }
  return { turns, error: null };
}

export function englishVoiceRegistry(voices: readonly SpeechSynthesisVoice[]): readonly BrowserVoice[] {
  const registry = new Map<string, BrowserVoice>();
  for (const voice of voices) {
    if (!/^en(?:[-_]|$)/iu.test(voice.lang) || !voice.name.trim()) continue;
    const id = browserVoiceId(voice);
    if (registry.has(id)) continue;
    registry.set(id, {
      id, displayName: voice.name, language: 'en', locale: voice.lang,
      localService: voice.localService, default: voice.default, voice,
    });
  }
  return [...registry.values()].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

export class VoiceRotationManager {
  private readonly items = new Map<string, { voiceId: string; preference: string | null; recovered: boolean }>();
  private lastVoiceId: string | null = null;

  // Session-qualified keys survive a player's next/back remount. Keep only the
  // most recently played items, rather than retaining arbitrary transcript text.
  constructor(private readonly maxItems = 512) {}

  resolve(item: string, voices: readonly BrowserVoice[], preferred?: string | null, rotate = true): BrowserVoice | null {
    const explicit = voices.find((entry) => entry.id === preferred || entry.voice.name === preferred);
    const record = this.items.get(item);
    const saved = voices.find((entry) => entry.id === record?.voiceId);
    if (record?.recovered && record.preference === (preferred ?? null) && saved) return saved;
    if (explicit) return explicit;
    if (saved) return saved;
    if (!rotate) return voices[0] ?? null;
    const previous = voices.findIndex((entry) => entry.id === this.lastVoiceId);
    return voices[(previous + 1) % voices.length] ?? null;
  }

  select(item: string, voices: readonly BrowserVoice[], preferred?: string | null, rotate = true): BrowserVoice | null {
    const selected = this.resolve(item, voices, preferred, rotate);
    if (!selected) return null;
    this.remember(item, selected, preferred);
    return selected;
  }

  getAssigned(item: string, voices: readonly BrowserVoice[], preferred?: string | null): BrowserVoice | null {
    const record = this.items.get(item);
    if (!record || record.preference !== (preferred ?? null)) return null;
    const explicit = voices.find(v => v.id === preferred || v.voice.name === preferred);
    if (explicit && explicit.id !== record.voiceId && !record.recovered) return null;
    return voices.find(v => v.id === record.voiceId) ?? null;
  }

  remember(item: string, selected: BrowserVoice, preferred?: string | null, recovered = false): void {
    const previous = this.items.get(item);
    const preference = preferred ?? null;
    const keepRecovery = previous?.voiceId === selected.id && previous.preference === preference && previous.recovered;
    this.items.delete(item);
    this.items.set(item, { voiceId: selected.id, preference, recovered: recovered || !!keepRecovery });
    if (this.items.size > this.maxItems) {
      const oldest = this.items.keys().next().value;
      if (oldest !== undefined) this.items.delete(oldest);
    }
    this.lastVoiceId = selected.id;
  }
}
import type { DialogueScript, DialogueSpeaker, SpeakerGender } from '@worklingo/content-format';
