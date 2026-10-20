export type SpeakerGender = 'male' | 'female';

export interface DialogueSpeaker {
  id: string;
  name: string;
  gender: SpeakerGender | null;
}

export interface DialogueTurn {
  speaker: string | null;
  text: string;
}

export interface DialogueScript {
  isDialogue: boolean;
  speakers: readonly DialogueSpeaker[];
  turns: readonly DialogueTurn[];
  issues: readonly { code: string; message: string }[];
}

// These headings are prose metadata/narration, not character names.
const NARRATION_LABELS = new Set([
  'note', 'notes', 'reminder', 'warning', 'tip', 'time', 'subject', 'from', 'to',
  'date', 'http', 'https', 'narrator', 'narration',
]);

function normalizeName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function isSpeakerName(name: string, annotated: boolean): boolean {
  const words = name.split(' ');
  return /^\p{L}/u.test(name) && !NARRATION_LABELS.has(name.toLowerCase()) && (annotated || words.length <= 4) &&
    words.every((word) => /^[\p{L}][\p{L}\p{M}\p{N}.'’-]*$|^\d+$/u.test(word)) &&
    (annotated || words.length === 1 || words.every((word) => /^[\p{Lu}\p{Lt}\p{N}]/u.test(word)));
}

function isNarrationLine(line: string): boolean {
  return /^\[.*\]$|^\([^():]*\)$|^(?:narrator|narration)\s*:/i.test(line);
}

function isMalformedHeading(line: string, knownNames: ReadonlySet<string>): boolean {
  if (isNarrationLine(line.trim())) return false;
  const colon = line.indexOf(':');
  const heading = (colon < 0 ? line : line.slice(0, colon)).trim();
  if (colon >= 0 && !heading) return true;
  if (colon >= 0 && /^\d+$/.test(heading) && !/^\d{1,2}:\d{2}\b/.test(line.trim())) return true;
  if (/[()]/.test(heading)) {
    const parenthetical = /^([^()]*)\(([^()]*)\)([^()]*)$/.exec(heading);
    if (parenthetical?.[3]?.trim()) {
      // A closed aside followed by prose is a sentence, unless it is an
      // explicit gender declaration missing its colon.
      const annotation = parenthetical[2]!.trim().normalize('NFKC').toLowerCase();
      if (colon >= 0 || !['male', 'female', 'nam', 'nữ', ''].includes(annotation)) return false;
    }
    const stem = normalizeName(heading.split(/[()]/, 1)[0]!);
    return !stem || knownNames.has(stem.toLowerCase()) || isSpeakerName(stem, !heading.includes('('));
  }
  return colon >= 0 && /^(?:[\p{L}\p{M}\p{N}.'’-]+[!?#]+|[@#][\p{L}\p{M}\p{N}.'’-]+)$/u.test(heading);
}

export function parseDialogue(text: string, options?: { forceDialogue?: boolean }): DialogueScript {
  const lines = text.split(/\r\n?|\n/);
  const matches = lines.map((line) => /^\s*([\p{L}\p{M}\p{N}\t .'’-]+?)(?:\s*\(([^()]*)\))?\s*:\s*(.*)$/u.exec(line));
  const knownNames = new Set(matches.flatMap((label) => label && isSpeakerName(normalizeName(label[1]!), label[2] !== undefined)
    ? [normalizeName(label[1]!).toLowerCase()] : []));
  const labels = matches.map((label) => label && knownNames.has(normalizeName(label[1]!).toLowerCase()) ? label : null);
  const malformed = lines.map((line, index) => {
    const label = labels[index];
    return label ? label[3]!.trimStart().startsWith(':') : isMalformedHeading(line, knownNames);
  });
  const isDialogue = options?.forceDialogue === true || labels.filter(Boolean).length >= 2 ||
    labels.some((label) => label?.[2] !== undefined) || malformed.some(Boolean);
  if (!isDialogue) {
    return { isDialogue: false, speakers: [], turns: text ? [{ speaker: null, text }] : [], issues: [] };
  }
  const speakers = new Map<string, DialogueSpeaker>();
  const turns: DialogueTurn[] = [];
  const issues: { code: string; message: string }[] = [];
  let currentSpeaker: string | null = null;
  for (const [index, label] of labels.entries()) {
    if (!label || malformed[index]) {
      const line = lines[index]!.trim();
      if (malformed[index]) {
        issues.push({ code: 'DIALOGUE_INVALID_LABEL', message: `Malformed speaker label on line ${index + 1}. Use Name (male/female/nam/nữ): text.` });
        currentSpeaker = null;
        turns.push({ speaker: null, text: line });
        continue;
      }
      if (isNarrationLine(line)) currentSpeaker = null;
      const previous = turns.at(-1);
      if (previous && previous.speaker === currentSpeaker) previous.text += `\n${line}`;
      else if (line) turns.push({ speaker: currentSpeaker, text: line });
      continue;
    }
    const name = normalizeName(label[1]!);
    const id = name.toLowerCase();
    const annotation = label[2]?.trim().normalize('NFKC').toLowerCase();
    const gender = annotation === 'nam' || annotation === 'male' ? 'male'
      : annotation === 'nữ' || annotation === 'female' ? 'female' : null;
    if (annotation !== undefined && gender === null) {
      issues.push({ code: 'DIALOGUE_INVALID_GENDER', message: `Speaker '${name}' has an empty or unsupported gender on line ${index + 1}. Use male, female, nam or nữ.` });
    }
    const existing = speakers.get(id);
    if (!existing) speakers.set(id, { id, name, gender });
    else if (gender && existing.gender && gender !== existing.gender) {
      issues.push({ code: 'DIALOGUE_CONFLICTING_GENDER', message: `Speaker '${existing.name}' has conflicting gender declarations on line ${index + 1}.` });
    } else if (gender) existing.gender = gender;
    turns.push({ speaker: id, text: label[3]! });
    currentSpeaker = id;
  }
  for (const turn of turns) {
    turn.text = turn.text.trim();
    if (turn.speaker !== null && !turn.text) {
      issues.push({ code: 'DIALOGUE_EMPTY_TURN', message: `Speaker '${speakers.get(turn.speaker)!.name}' has a turn without dialogue text.` });
    }
  }
  if (speakers.size > 2) {
    for (const speaker of speakers.values()) {
      if (speaker.gender === null) issues.push({ code: 'DIALOGUE_MISSING_GENDER', message: `Speaker '${speaker.name}' needs an explicit gender because the dialogue has more than two characters.` });
    }
  }
  return { isDialogue, speakers: [...speakers.values()], turns, issues };
}
