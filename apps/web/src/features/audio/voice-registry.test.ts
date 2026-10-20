import { describe, expect, it } from 'vitest';
import { browserVoiceGender, planBrowserSpeech, englishVoiceRegistry, VoiceRotationManager } from './voice-registry';

const voice = (id: string, lang = 'en-US', name = id): SpeechSynthesisVoice => ({
  default: false, lang, localService: true, name, voiceURI: id,
});

describe('voice registry and rotation', () => {
  it('identifies documented voice metadata while leaving unknown voices unspecified', () => {
    expect(browserVoiceGender(voice('google-f', 'en-GB', 'Google UK English Female'))).toBe('female');
    expect(browserVoiceGender(voice('google-m', 'en-GB', 'Google UK English Male'))).toBe('male');
    expect(browserVoiceGender(voice('david', 'en-US', 'Microsoft David - English (United States)'))).toBe('male');
    expect(browserVoiceGender(voice('zira', 'en-US', 'Microsoft Zira Desktop - English (United States)'))).toBe('female');
    expect(browserVoiceGender(voice('custom', 'en-US', 'Alex'))).toBeNull();
  });

  it('allocates gendered speakers before unspecified ones with distinct stable voices', () => {
    const male = voice('a-male', 'en-GB', 'Google UK English Male');
    const female = voice('b-female', 'en-GB', 'Google UK English Female');
    const voices = englishVoiceRegistry([male, female]);
    const script = {
      isDialogue: true, issues: [],
      speakers: [{ id: 'visitor', name: 'Visitor', gender: null }, { id: 'an', name: 'An', gender: 'male' as const }],
      turns: [{ speaker: 'visitor', text: 'Hi.' }, { speaker: 'an', text: 'Hello.' }, { speaker: 'visitor', text: 'Thanks.' }],
    };
    const manager = new VoiceRotationManager();
    const plan = planBrowserSpeech(script, voices, manager, 'item', male.voiceURI);
    expect(plan.error).toBeNull();
    expect(plan.turns.map((turn) => [turn.text, turn.voice.id])).toEqual([
      ['Hi.', 'b-female'], ['Hello.', 'a-male'], ['Thanks.', 'b-female'],
    ]);
    for (const turn of plan.turns) manager.select(turn.key, voices, turn.voice.id);
    expect(planBrowserSpeech(script, voices, manager, 'item', male.voiceURI).turns.map(turn => turn.voice.id))
      .toEqual(['b-female', 'a-male', 'b-female']);
  });

  it('reports unavailable matching genders and insufficient distinct voices instead of mismatching characters', () => {
    const female = englishVoiceRegistry([voice('f', 'en-GB', 'Google UK English Female')]);
    const script = { isDialogue: true, issues: [], speakers: [{ id: 'an', name: 'An', gender: 'male' as const }], turns: [{ speaker: 'an', text: 'Hello.' }] };
    expect(planBrowserSpeech(script, female, new VoiceRotationManager(), 'item').error).toBe('dialogueGenderUnavailable');
    const legacy = { ...script, speakers: [{ id: 'an', name: 'An', gender: null }, { id: 'lan', name: 'Lan', gender: null }], turns: [{ speaker: 'an', text: 'Hi.' }, { speaker: 'lan', text: 'Hello.' }] };
    expect(planBrowserSpeech(legacy, female, new VoiceRotationManager(), 'item').error).toBe('dialogueVoicesUnavailable');
  });

  it('assigns three characters with two men to three different matching voices', () => {
    const voices = englishVoiceRegistry([
      voice('a', 'en-US', 'Microsoft David - English (United States)'),
      voice('b', 'en-US', 'Microsoft Mark - English (United States)'),
      voice('c', 'en-US', 'Microsoft Zira - English (United States)'),
    ]);
    const speakers = [
      { id: 'an', name: 'An', gender: 'male' as const },
      { id: 'minh', name: 'Minh', gender: 'male' as const },
      { id: 'lan', name: 'Lan', gender: 'female' as const },
    ];
    const script = { isDialogue: true, issues: [], speakers, turns: speakers.map(s => ({ speaker: s.id, text: 'Hello.' })) };
    const plan = planBrowserSpeech(script, voices, new VoiceRotationManager(), 'three');
    expect(plan.error).toBeNull();
    expect(plan.turns.map(t => t.voice.id)).toEqual(['a', 'b', 'c']);
    expect(planBrowserSpeech(script, voices.filter(v => v.id !== 'b'), new VoiceRotationManager(), 'three').error)
      .toBe('dialogueVoicesUnavailable');
  });
  it('filters exact English language tags, deduplicates stable IDs and preserves real metadata', () => {
    const registry = englishVoiceRegistry([
      voice('c', 'en-AU'), voice('a'), voice('a'), voice('b', 'en-GB'),
      voice('vi', 'vi-VN'), voice('bad', 'english'), voice('blank', 'en-US', ''), voice('', 'en-CA', 'Canadian'),
    ]);
    expect(registry.map((entry) => entry.id)).toEqual(['a', 'b', 'c', 'en-CA:Canadian']);
    expect(registry[1]).toMatchObject({ displayName: 'b', language: 'en', locale: 'en-GB', localService: true });
  });

  it('cycles all eligible voices without repeats and preserves replay assignments', () => {
    const manager = new VoiceRotationManager();
    const voices = englishVoiceRegistry([voice('c'), voice('a'), voice('b')]);
    expect(['first', 'second', 'third', 'fourth'].map((item) => manager.select(item, voices)?.id)).toEqual(['a', 'b', 'c', 'a']);
    expect(manager.select('second', voices)?.id).toBe('b');
    expect(manager.select('first', voices)?.id).toBe('a');
  });

  it('honors explicit URI and legacy name preferences and recovers from disappearing voices', () => {
    const manager = new VoiceRotationManager();
    const voices = englishVoiceRegistry([voice('a'), voice('b', 'en-GB', 'British')]);
    expect(manager.select('item', voices, 'British')?.id).toBe('b');
    expect(manager.select('item', voices, 'a')?.id).toBe('a');
    expect(manager.select('item', voices.slice(1))?.id).toBe('b');
    expect(manager.select('item', [])).toBeNull();
  });

  it('can disable rotation for new items without changing assigned replays', () => {
    const manager = new VoiceRotationManager();
    const voices = englishVoiceRegistry([voice('a'), voice('b')]);
    expect(manager.select('first', voices)?.id).toBe('a');
    expect(manager.select('second', voices, null, false)?.id).toBe('a');
  });

  it('bounds replay memory and evicts the least recently replayed item', () => {
    const manager = new VoiceRotationManager(2);
    const voices = englishVoiceRegistry([voice('a'), voice('b'), voice('c')]);
    expect(manager.select('first', voices)?.id).toBe('a');
    expect(manager.select('second', voices)?.id).toBe('b');
    expect(manager.select('first', voices)?.id).toBe('a');
    expect(manager.select('third', voices)?.id).toBe('b');
    expect(manager.select('second', voices)?.id).toBe('c');
    expect(manager.select('third', voices)?.id).toBe('b');
  });
});
