import { parseDialogue, type SpeakerGender } from '@worklingo/content-format';

import type { SpeakerVoiceAssignment } from '../domain/text-to-speech.port.js';

/** Bump whenever parsing, voice allocation or SSML semantics change. */
export const AZURE_AUDIO_GENERATION_VERSION = 'azure-dialogue-v1';

// Small, explicit English catalog; never infer gender from a character's name.
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=text-to-speech
const voices: readonly { readonly id: string; readonly gender: SpeakerGender }[] = [
  { id: 'en-US-GuyNeural', gender: 'male' },
  { id: 'en-US-DavisNeural', gender: 'male' },
  { id: 'en-US-TonyNeural', gender: 'male' },
  { id: 'en-US-JennyNeural', gender: 'female' },
  { id: 'en-US-AriaNeural', gender: 'female' },
  { id: 'en-US-SaraNeural', gender: 'female' },
];

const escapeXml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export function buildAzureDialogueSsml(script: string, narrationVoice: string): {
  readonly ssml: string;
  readonly speakerVoices: readonly SpeakerVoiceAssignment[];
} {
  const dialogue = parseDialogue(script);
  if (dialogue.issues.length > 0) {
    throw new Error(`Invalid dialogue script: ${dialogue.issues.map((issue) => issue.message).join('; ')}`);
  }

  const assigned = new Map<string, SpeakerVoiceAssignment>();
  const used = new Set<string>();
  const preferred = voices.find((voice) => voice.id === narrationVoice);
  const pool = preferred ? [preferred, ...voices.filter((voice) => voice !== preferred)] : voices;
  // Reserve compatible voices for declared genders before allocating legacy speakers.
  const allocationOrder = [
    ...dialogue.speakers.filter((speaker) => speaker.gender !== null),
    ...dialogue.speakers.filter((speaker) => speaker.gender === null),
  ];
  for (const speaker of allocationOrder) {
    const voice = pool.find((candidate) => !used.has(candidate.id)
      && (speaker.gender === null || candidate.gender === speaker.gender));
    if (!voice) {
      throw new Error(`No distinct Azure English ${speaker.gender ?? 'compatible'} voice available for ${speaker.name}.`);
    }
    used.add(voice.id);
    assigned.set(speaker.id, {
      speaker: speaker.id, name: speaker.name, gender: speaker.gender,
      voice: voice.id, voiceGender: voice.gender,
    });
  }

  const voiceElement = (voice: string, text: string) =>
    `<voice name="${escapeXml(voice)}">${escapeXml(text)}</voice>`;
  const body = dialogue.isDialogue
    ? dialogue.turns.map((turn) => voiceElement(
      turn.speaker === null ? narrationVoice : assigned.get(turn.speaker)!.voice, turn.text,
    )).join('')
    : voiceElement(narrationVoice, script);
  return {
    ssml: `<speak version="1.0" xml:lang="en-US">${body}</speak>`,
    speakerVoices: dialogue.speakers.map((speaker) => assigned.get(speaker.id)!),
  };
}
