import type { AudioScriptNode, LessonDocumentNode } from './ast.ts';
import type { ContentIssue } from './issues.ts';
import { parseDialogue } from './dialogue.ts';
import { parseLessonSource } from './parser.ts';

type Script = Pick<AudioScriptNode, 'script' | 'speaker' | 'spokenText' | 'speechReview'>;
export function spokenScript(script: Script): string { return script.spokenText ?? script.script; }

/** Preserve existing artifact hashes when no rendition is configured. */
export function audioScriptFingerprintText(script: Script): string {
  return script.spokenText === undefined ? script.script : JSON.stringify([
    'narration-v1', script.script, script.speaker ?? '', script.spokenText, script.speechReview ?? '',
  ]);
}

/** SHA-256 is supplied by the host's native crypto; no crypto implementation in the browser bundle. */
export function narrationReviewInput(document: LessonDocumentNode, script: AudioScriptNode): string {
  const activities = document.activities.filter(a => a.audioRef === script.slug);
  return JSON.stringify(['narration-review-v1', script.slug, script.script, script.speaker ?? '', script.spokenText ?? '',
    activities.map(a => [a.slug, a.question, a.prompt, a.options.map(o => o.text), a.answer, a.explanation, a.evidence]),
    document.contents.filter(c => activities.some(a => a.contentRefs.includes(c.slug) || a.evidence.some(e => e.startsWith(`${c.slug}:`))))
      .map(c => [c.slug, c.text]),
    document.audioScripts.filter(s => activities.some(a => a.evidence.some(e => e.startsWith(`${s.slug}:`))))
      .map(s => [s.slug, s.script]),
  ]);
}

/** No boundary/no definite header => no suggestion. Never strip signatures, numbers or links in the body. */
export function suggestEmailBody(text: string): string | null {
  const lines = text.replace(/\r\n?/gu, '\n').split('\n');
  let index = 0;
  const fields = new Set<string>();
  for (; index < lines.length; index++) {
    const line = lines[index]!;
    const header = /^(From|To|Cc|Bcc|Date|Subject|Từ|Đến|Ngày|Chủ đề):\s*\S/iu.exec(line);
    if (!header) break;
    fields.add(header[1]!.toLowerCase());
  }
  if (fields.size < 2 || !['from', 'từ'].some(f => fields.has(f)) || lines[index]?.trim() !== '') return null;
  const body = lines.slice(index + 1).join('\n').trim();
  return body ? body : null;
}

function audibleWords(text: string, forceDialogue = false): string {
  return parseDialogue(text, { forceDialogue }).turns.map(t => t.text).join(' ').normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export function narrationEvidenceIssues(document: LessonDocumentNode, script: AudioScriptNode): ContentIssue[] {
  if (script.spokenText === undefined) return [];
  const issues: ContentIssue[] = [];
  const add = (code: string, message: string, severity: 'error' | 'warning' = 'error') => issues.push({
    code, message, severity, range: script.range, path: `audio_script.${script.slug}.spoken_text`,
  });
  if (!script.spokenText.trim()) add('NARRATION_EMPTY', 'Spoken text must not be empty.');
  if (!/^[a-f0-9]{64}$/u.test(script.speechReview ?? '')) add('NARRATION_REVIEW_REQUIRED', 'Review and confirm the spoken text before generating or publishing audio.');
  for (const issue of parseDialogue(script.spokenText).issues) add(issue.code, issue.message);
  const audible = audibleWords(script.spokenText);
  for (const activity of document.activities.filter(a => a.audioRef === script.slug)) {
    if (!activity.evidence.length) add('NARRATION_MANUAL_EVIDENCE', `Check all listening data manually for ${activity.slug}: no line evidence is provided.`, 'warning');
    for (const evidence of activity.evidence) {
      const match = /^([^:]+):([1-9]\d*)$/u.exec(evidence);
      const content = match ? document.contents.find(c => c.slug === match[1]) : undefined;
      const evidenceScript = match ? document.audioScripts.find(s => s.slug === match[1]) : undefined;
      const line = (content?.text ?? evidenceScript?.script)?.split(/\r\n?|\n/u)[Number(match?.[2]) - 1];
      if (!line?.trim()) {
        add('NARRATION_MANUAL_EVIDENCE', `Check ${activity.slug} (${evidence}) manually: evidence cannot be matched to a nonempty source line.`, 'warning');
      } else if (!audible.includes(audibleWords(line, parseDialogue(script.script).isDialogue))) {
        add('NARRATION_EVIDENCE_REMOVED', `Listening question ${activity.slug} needs ${evidence}: ${line}`);
      }
    }
  }
  return issues;
}

/** Replace only this section; source ranges make embedded delimiter-like prose harmless. */
export function setAudioNarration(source: string, slug: string, text: string | undefined, review?: string): string {
  const script = parseLessonSource(source).document.audioScripts.find(s => s.slug === slug);
  if (!script) throw new Error('Audio script not found');
  if (text !== undefined && (text.includes('\0') || text.split(/\r\n?|\n/u).some(l => /^\s*(?:<<<|>>>|\[\/AUDIO_SCRIPT\])\s*$/u.test(l)))) {
    throw new Error('Spoken text contains reserved source delimiters.');
  }
  const lines = source.slice(script.range.start.offset, script.range.end.offset).match(/[^\n]*\n|[^\n]+$/gu) ?? [];
  let multiline = false;
  const kept: string[] = [];
  let closingIndex = -1;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!multiline && /^\s*spoken_text:/u.test(line)) {
      if (lines[index + 1]?.trim() === '<<<') {
        index += 2;
        while (index < lines.length && lines[index]!.trim() !== '>>>') index++;
      }
      continue;
    }
    if (!multiline && /^\s*speech_review:/u.test(line)) continue;
    if (!multiline && line.trim() === '[/AUDIO_SCRIPT]') closingIndex = kept.length;
    kept.push(line);
    if (line.trim() === '<<<') multiline = true;
    if (line.trim() === '>>>') multiline = false;
  }
  if (closingIndex < 0) throw new Error('Audio script closing section is missing.');
  if (text !== undefined) kept.splice(closingIndex, 0,
    `spoken_text:\n<<<\n${text.replace(/\r\n?/gu, '\n')}\n>>>\nspeech_review: ${review ?? ''}\n`);
  const updated = kept.join('');
  return source.slice(0, script.range.start.offset) + updated + source.slice(script.range.end.offset);
}
