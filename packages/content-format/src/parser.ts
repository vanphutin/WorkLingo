import {
  type ActivityNode,
  type ActivityOptionNode,
  type AudioScriptNode,
  type ContentNode,
  type LanguageBlockNode,
  type LessonDocumentNode,
  type LessonNode,
  type WordBankNode,
} from './ast.js';
import type { ContentIssue } from './issues.js';
import { createSourceLocator, type SourceRange } from './source-location.js';

export type ParseLessonResult = {
  readonly document: LessonDocumentNode;
  readonly issues: readonly ContentIssue[];
};

const IDENTIFIER_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseLessonSource(source: string): ParseLessonResult {
  const locator = createSourceLocator(source);
  const issues: ContentIssue[] = [];

  const wordBanks: WordBankNode[] = [];
  const contents: ContentNode[] = [];
  const audioScripts: AudioScriptNode[] = [];
  const activities: ActivityNode[] = [];
  let lesson: LessonNode | undefined;

  // Split into lines while tracking line offsets in source
  // We can scan line by line
  interface LineInfo {
    index: number; // 0-based
    startOffset: number;
    endOffset: number; // excluding \r\n
    fullEndOffset: number; // including \r\n
    text: string; // trimmed of line terminators
  }

  const lines: LineInfo[] = [];
  let currentOffset = 0;
  const len = source.length;

  while (currentOffset < len) {
    const start = currentOffset;
    let end = start;
    while (end < len && source.charCodeAt(end) !== 10 && source.charCodeAt(end) !== 13) {
      end++;
    }
    const lineText = source.slice(start, end);
    let fullEnd = end;
    if (fullEnd < len && source.charCodeAt(fullEnd) === 13) {
      fullEnd++;
    }
    if (fullEnd < len && source.charCodeAt(fullEnd) === 10) {
      fullEnd++;
    }
    lines.push({
      index: lines.length,
      startOffset: start,
      endOffset: end,
      fullEndOffset: fullEnd,
      text: lineText,
    });
    currentOffset = fullEnd;
  }

  if (lines.length === 0) {
    lines.push({
      index: 0,
      startOffset: 0,
      endOffset: 0,
      fullEndOffset: 0,
      text: '',
    });
  }

  function addIssue(
    code: string,
    message: string,
    startOffset: number,
    endOffset: number,
    severity: 'error' | 'warning' = 'error',
    path?: string,
  ) {
    const range = locator.range(
      Math.max(0, Math.min(len, startOffset)),
      Math.max(0, Math.min(len, endOffset)),
    );
    issues.push({ code, severity, message, path, range });
  }

  let lineIdx = 0;

  // 1. Verify FORMAT header on first non-empty line
  let formatFound = false;
  let formatVersion = '';

  while (lineIdx < lines.length) {
    const line = lines[lineIdx]!;
    const cleanText = line.text.replace(/^\uFEFF/, '').trim();
    if (cleanText === '') {
      lineIdx++;
      continue;
    }

    if (cleanText.startsWith('FORMAT:')) {
      const parts = cleanText.split(':');
      const val = parts.slice(1).join(':').trim();
      if (val === 'WorkLingoLesson/1.0') {
        formatFound = true;
        formatVersion = val;
      } else {
        addIssue(
          'PARSE_UNSUPPORTED_FORMAT',
          `Unsupported format: '${val}'. Expected 'WorkLingoLesson/1.0'`,
          line.startOffset,
          line.endOffset,
        );
      }
    } else {
      addIssue(
        'PARSE_UNSUPPORTED_FORMAT',
        `Missing FORMAT declaration on first line. Found '${cleanText}'`,
        line.startOffset,
        line.endOffset,
      );
    }
    lineIdx++;
    break;
  }

  if (!formatFound && issues.length === 0) {
    addIssue('PARSE_UNSUPPORTED_FORMAT', 'Missing FORMAT header', 0, 0);
  }

  // Helper to read multiline block starting after `<<<`
  function readMultiline(startLineIdx: number): { text: string; nextLineIdx: number; closed: boolean } {
    let cur = startLineIdx;
    const contentLines: string[] = [];
    while (cur < lines.length) {
      const l = lines[cur]!;
      if (l.text.trim() === '>>>') {
        return { text: contentLines.join('\n'), nextLineIdx: cur + 1, closed: true };
      }
      contentLines.push(l.text);
      cur++;
    }
    return { text: contentLines.join('\n'), nextLineIdx: cur, closed: false };
  }

  // Parse sections
  while (lineIdx < lines.length) {
    const line = lines[lineIdx]!;
    const trimmed = line.text.trim();

    if (trimmed === '') {
      lineIdx++;
      continue;
    }

    // Top-level sections:
    // [LESSON]
    // [WORD_BANK slug]
    // [CONTENT slug]
    // [AUDIO_SCRIPT slug]
    // [ACTIVITY slug]
    if (trimmed.startsWith('[') && !trimmed.startsWith('[[')) {
      if (trimmed.startsWith('[/')) {
        // Unexpected closing tag outside an active section
        addIssue('PARSE_MISMATCHED_SECTION', `Unexpected closing section '${trimmed}'`, line.startOffset, line.endOffset);
        lineIdx++;
        continue;
      }

      const match = trimmed.match(/^\[([A-Z_]+)(?:\s+([^\s\]]+))?\]$/);
      if (!match) {
        addIssue('PARSE_UNKNOWN_SECTION', `Malformed section header '${trimmed}'`, line.startOffset, line.endOffset);
        lineIdx++;
        continue;
      }

      const sectionType = match[1]!;
      const sectionSlug = match[2];
      const sectionStartOffset = line.startOffset;

      if (sectionSlug && !IDENTIFIER_REGEX.test(sectionSlug)) {
        addIssue(
          'PARSE_INVALID_IDENTIFIER',
          `Invalid identifier '${sectionSlug}'. Must be lowercase kebab-case.`,
          line.startOffset,
          line.endOffset,
          'error',
          sectionSlug,
        );
      }

      lineIdx++;

      if (sectionType === 'LESSON') {
        const fields = parseScalarSection(['slug', 'title', 'level', 'duration_minutes', 'objective']);
        const endOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : sectionStartOffset;
        const slugVal = fields['slug']?.value || sectionSlug || '';
        if (slugVal && !IDENTIFIER_REGEX.test(slugVal)) {
          addIssue(
            'PARSE_INVALID_IDENTIFIER',
            `Invalid lesson slug '${slugVal}'. Must be lowercase kebab-case.`,
            fields['slug']?.range.start.offset ?? sectionStartOffset,
            fields['slug']?.range.end.offset ?? sectionStartOffset,
          );
        }

        lesson = {
          kind: 'lesson',
          range: locator.range(sectionStartOffset, endOffset),
          slug: slugVal,
          title: fields['title']?.value || '',
          level: fields['level']?.value || '',
          durationMinutes: parseInt(fields['duration_minutes']?.value || '0', 10),
          objective: fields['objective']?.value || '',
        };
      } else if (sectionType === 'WORD_BANK') {
        const bankSlug = sectionSlug || '';
        let bankTitle = '';
        const languageBlocks: LanguageBlockNode[] = [];
        let closed = false;

        const bankStartOffset = sectionStartOffset;

        while (lineIdx < lines.length) {
          const bankLine = lines[lineIdx]!;
          const bTrimmed = bankLine.text.trim();

          if (bTrimmed === '') {
            lineIdx++;
            continue;
          }

          if (bTrimmed === '[/WORD_BANK]') {
            closed = true;
            lineIdx++;
            break;
          }

          if (bTrimmed.startsWith('[/')) {
            addIssue(
              'PARSE_MISMATCHED_SECTION',
              `Mismatched closing tag '${bTrimmed}', expected '[/WORD_BANK]'`,
              bankLine.startOffset,
              bankLine.endOffset,
            );
            lineIdx++;
            break;
          }

          if (bTrimmed.startsWith('[') && !bTrimmed.startsWith('[[')) {
            // Next top-level section started without closing this WORD_BANK!
            break;
          }

          // Language Block inside WORD_BANK
          if (bTrimmed.startsWith('[[LANGUAGE_BLOCK')) {
            const lbMatch = bTrimmed.match(/^\[\[LANGUAGE_BLOCK(?:\s+([^\s\]]+))?\]\]$/);
            const lbSlug = lbMatch?.[1] || '';
            const lbStartOffset = bankLine.startOffset;

            if (lbSlug && !IDENTIFIER_REGEX.test(lbSlug)) {
              addIssue(
                'PARSE_INVALID_IDENTIFIER',
                `Invalid language block slug '${lbSlug}'. Must be lowercase kebab-case.`,
                bankLine.startOffset,
                bankLine.endOffset,
              );
            }

            lineIdx++;
            const lbFields: Record<string, { value: string; range: SourceRange }> = {};
            const examples: string[] = [];
            const commonErrors: string[] = [];
            let lbClosed = false;

            const allowedLbKeys = new Set([
              'expression',
              'meaning_vi',
              'pronunciation',
              'collocations',
              'grammar_pattern',
              'example',
              'common_error',
            ]);

            while (lineIdx < lines.length) {
              const lbLine = lines[lineIdx]!;
              const lbt = lbLine.text.trim();

              if (lbt === '') {
                lineIdx++;
                continue;
              }

              if (lbt === '[[/LANGUAGE_BLOCK]]') {
                lbClosed = true;
                lineIdx++;
                break;
              }

              if (lbt.startsWith('[[') || (lbt.startsWith('[') && !lbt.startsWith('[['))) {
                // Next block or section started without closing
                break;
              }

              const colonIdx = lbLine.text.indexOf(':');
              if (colonIdx === -1) {
                addIssue('PARSE_SYNTAX_ERROR', `Expected key: value, got '${lbt}'`, lbLine.startOffset, lbLine.endOffset);
                lineIdx++;
                continue;
              }

              const k = lbLine.text.slice(0, colonIdx).trim();
              const v = lbLine.text.slice(colonIdx + 1).trim();

              if (!allowedLbKeys.has(k)) {
                addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}' in LANGUAGE_BLOCK`, lbLine.startOffset, lbLine.endOffset);
              } else if (k === 'example') {
                examples.push(v);
              } else if (k === 'common_error') {
                commonErrors.push(v);
              } else if (lbFields[k]) {
                addIssue('PARSE_DUPLICATE_FIELD', `Duplicate field '${k}' in LANGUAGE_BLOCK`, lbLine.startOffset, lbLine.endOffset);
              } else {
                lbFields[k] = {
                  value: v,
                  range: locator.range(lbLine.startOffset, lbLine.endOffset),
                };
              }
              lineIdx++;
            }

            if (!lbClosed) {
              addIssue('PARSE_UNCLOSED_SECTION', `Unclosed [[LANGUAGE_BLOCK ${lbSlug}]]`, lbStartOffset, lbStartOffset + 16);
            }

            const lbEndOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : lbStartOffset;
            const colls = lbFields['collocations']?.value
              ? lbFields['collocations'].value.split('|').map((s) => s.trim()).filter(Boolean)
              : [];

            languageBlocks.push({
              kind: 'language_block',
              range: locator.range(lbStartOffset, lbEndOffset),
              slug: lbSlug,
              expression: lbFields['expression']?.value || '',
              meaningVi: lbFields['meaning_vi']?.value || '',
              pronunciation: lbFields['pronunciation']?.value,
              collocations: colls,
              grammarPattern: lbFields['grammar_pattern']?.value,
              examples,
              commonErrors,
            });
            continue;
          }

          // Fields of WORD_BANK (e.g. title: ...)
          const colonIdx = bankLine.text.indexOf(':');
          if (colonIdx !== -1) {
            const k = bankLine.text.slice(0, colonIdx).trim();
            const v = bankLine.text.slice(colonIdx + 1).trim();
            if (k === 'title') {
              bankTitle = v;
            } else {
              addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}' in WORD_BANK`, bankLine.startOffset, bankLine.endOffset);
            }
          }
          lineIdx++;
        }

        if (!closed) {
          addIssue('PARSE_UNCLOSED_SECTION', `Unclosed [WORD_BANK ${bankSlug}]`, bankStartOffset, bankStartOffset + 11);
        }

        const bankEndOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : bankStartOffset;
        wordBanks.push({
          kind: 'word_bank',
          range: locator.range(bankStartOffset, bankEndOffset),
          slug: bankSlug,
          title: bankTitle,
          languageBlocks,
        });
      } else if (sectionType === 'CONTENT') {
        const contentSlug = sectionSlug || '';
        let contentType = '';
        let contentText = '';
        let closed = false;
        const contentStartOffset = sectionStartOffset;

        while (lineIdx < lines.length) {
          const cLine = lines[lineIdx]!;
          const ct = cLine.text.trim();

          if (ct === '') {
            lineIdx++;
            continue;
          }

          if (ct === '[/CONTENT]') {
            closed = true;
            lineIdx++;
            break;
          }

          if (ct.startsWith('[/')) {
            addIssue('PARSE_MISMATCHED_SECTION', `Mismatched closing tag '${ct}', expected '[/CONTENT]'`, cLine.startOffset, cLine.endOffset);
            lineIdx++;
            break;
          }

          if (ct.startsWith('[') && !ct.startsWith('[[')) {
            break;
          }

          if (ct.startsWith('text:')) {
            lineIdx++;
            if (lineIdx < lines.length && lines[lineIdx]!.text.trim() === '<<<') {
              const multi = readMultiline(lineIdx + 1);
              if (!multi.closed) {
                addIssue('PARSE_UNCLOSED_MULTILINE', 'Unclosed multiline block in CONTENT', cLine.startOffset, cLine.endOffset);
              }
              contentText = multi.text;
              lineIdx = multi.nextLineIdx;
            } else {
              contentText = cLine.text.slice(5).trim();
            }
            continue;
          }

          const colonIdx = cLine.text.indexOf(':');
          if (colonIdx !== -1) {
            const k = cLine.text.slice(0, colonIdx).trim();
            const v = cLine.text.slice(colonIdx + 1).trim();
            if (k === 'type') {
              contentType = v;
            } else {
              addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}' in CONTENT`, cLine.startOffset, cLine.endOffset);
            }
          }
          lineIdx++;
        }

        if (!closed) {
          addIssue('PARSE_UNCLOSED_SECTION', `Unclosed [CONTENT ${contentSlug}]`, contentStartOffset, contentStartOffset + 9);
        }

        const contentEndOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : contentStartOffset;
        contents.push({
          kind: 'content',
          range: locator.range(contentStartOffset, contentEndOffset),
          slug: contentSlug,
          type: contentType,
          text: contentText,
        });
      } else if (sectionType === 'AUDIO_SCRIPT') {
        const audioSlug = sectionSlug || '';
        let speaker: string | undefined;
        let scriptText = '';
        let closed = false;
        const audioStartOffset = sectionStartOffset;

        while (lineIdx < lines.length) {
          const aLine = lines[lineIdx]!;
          const at = aLine.text.trim();

          if (at === '') {
            lineIdx++;
            continue;
          }

          if (at === '[/AUDIO_SCRIPT]') {
            closed = true;
            lineIdx++;
            break;
          }

          if (at.startsWith('[/')) {
            addIssue('PARSE_MISMATCHED_SECTION', `Mismatched closing tag '${at}', expected '[/AUDIO_SCRIPT]'`, aLine.startOffset, aLine.endOffset);
            lineIdx++;
            break;
          }

          if (at.startsWith('[') && !at.startsWith('[[')) {
            break;
          }

          if (at.startsWith('script:')) {
            lineIdx++;
            if (lineIdx < lines.length && lines[lineIdx]!.text.trim() === '<<<') {
              const multi = readMultiline(lineIdx + 1);
              if (!multi.closed) {
                addIssue('PARSE_UNCLOSED_MULTILINE', 'Unclosed multiline block in AUDIO_SCRIPT', aLine.startOffset, aLine.endOffset);
              }
              scriptText = multi.text;
              lineIdx = multi.nextLineIdx;
            } else {
              scriptText = aLine.text.slice(7).trim();
            }
            continue;
          }

          const colonIdx = aLine.text.indexOf(':');
          if (colonIdx !== -1) {
            const k = aLine.text.slice(0, colonIdx).trim();
            const v = aLine.text.slice(colonIdx + 1).trim();
            if (k === 'speaker') {
              speaker = v;
            } else {
              addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}' in AUDIO_SCRIPT`, aLine.startOffset, aLine.endOffset);
            }
          }
          lineIdx++;
        }

        if (!closed) {
          addIssue('PARSE_UNCLOSED_SECTION', `Unclosed [AUDIO_SCRIPT ${audioSlug}]`, audioStartOffset, audioStartOffset + 14);
        }

        const audioEndOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : audioStartOffset;
        audioScripts.push({
          kind: 'audio_script',
          range: locator.range(audioStartOffset, audioEndOffset),
          slug: audioSlug,
          speaker,
          script: scriptText,
        });
      } else if (sectionType === 'ACTIVITY') {
        const actSlug = sectionSlug || '';
        const actStartOffset = sectionStartOffset;
        let closed = false;

        const scalarFields: Record<string, { value: string; range: SourceRange }> = {};
        const options: ActivityOptionNode[] = [];
        let questionText: string | undefined;
        let explanationText: string | undefined;
        let evidenceList: string[] = [];

        const allowedKeys = new Set([
          'learning_block',
          'activity_type',
          'response_type',
          'skills',
          'content_refs',
          'language_block_refs',
          'audio_ref',
          'rubric',
          'prompt',
          'answer',
        ]);

        while (lineIdx < lines.length) {
          const actLine = lines[lineIdx]!;
          const at = actLine.text.trim();

          if (at === '') {
            lineIdx++;
            continue;
          }

          if (at === '[/ACTIVITY]') {
            closed = true;
            lineIdx++;
            break;
          }

          if (at.startsWith('[/')) {
            addIssue('PARSE_MISMATCHED_SECTION', `Mismatched closing tag '${at}', expected '[/ACTIVITY]'`, actLine.startOffset, actLine.endOffset);
            lineIdx++;
            break;
          }

          if (at.startsWith('[') && !at.startsWith('[[')) {
            break;
          }

          // Handle uppercase block headers: QUESTION:, OPTIONS:, EXPLANATION:, EVIDENCE:
          if (at === 'QUESTION:' || at.startsWith('QUESTION:')) {
            const inlineVal = at.slice(9).trim();
            if (inlineVal) {
              questionText = inlineVal;
              lineIdx++;
            } else {
              lineIdx++;
              const qLines: string[] = [];
              while (lineIdx < lines.length) {
                const ql = lines[lineIdx]!;
                const qt = ql.text.trim();
                if (qt === '' || qt.startsWith('OPTIONS:') || qt.startsWith('ANSWER:') || qt.startsWith('EXPLANATION:') || qt.startsWith('EVIDENCE:') || qt === '[/ACTIVITY]') {
                  break;
                }
                qLines.push(ql.text);
                lineIdx++;
              }
              questionText = qLines.join('\n').trim();
            }
            continue;
          }

          if (at === 'OPTIONS:' || at.startsWith('OPTIONS:')) {
            lineIdx++;
            while (lineIdx < lines.length) {
              const optLine = lines[lineIdx]!;
              const ot = optLine.text.trim();
              if (ot === '' || ot.startsWith('ANSWER:') || ot.startsWith('EXPLANATION:') || ot.startsWith('EVIDENCE:') || ot === '[/ACTIVITY]') {
                break;
              }
              // Option format: A. Text
              const optMatch = ot.match(/^([A-Z])\.\s*(.+)$/);
              if (optMatch) {
                options.push({
                  label: optMatch[1]!,
                  text: optMatch[2]!,
                  range: locator.range(optLine.startOffset, optLine.endOffset),
                });
              }
              lineIdx++;
            }
            continue;
          }

          if (at === 'ANSWER:' || at.startsWith('ANSWER:')) {
            const inlineVal = at.slice(7).trim();
            if (inlineVal) {
              scalarFields['answer'] = {
                value: inlineVal,
                range: locator.range(actLine.startOffset, actLine.endOffset),
              };
              lineIdx++;
            } else {
              lineIdx++;
              while (lineIdx < lines.length) {
                const al = lines[lineIdx]!;
                const at2 = al.text.trim();
                if (at2 === '' || at2.startsWith('EXPLANATION:') || at2.startsWith('EVIDENCE:') || at2 === '[/ACTIVITY]') {
                  break;
                }
                scalarFields['answer'] = {
                  value: at2,
                  range: locator.range(al.startOffset, al.endOffset),
                };
                lineIdx++;
                break;
              }
            }
            continue;
          }

          if (at === 'EXPLANATION:' || at.startsWith('EXPLANATION:')) {
            const inlineVal = at.slice(12).trim();
            if (inlineVal) {
              explanationText = inlineVal;
              lineIdx++;
            } else {
              lineIdx++;
              const expLines: string[] = [];
              while (lineIdx < lines.length) {
                const el = lines[lineIdx]!;
                const et = el.text.trim();
                if (et === '' || et.startsWith('EVIDENCE:') || et === '[/ACTIVITY]') {
                  break;
                }
                expLines.push(el.text);
                lineIdx++;
              }
              explanationText = expLines.join('\n').trim();
            }
            continue;
          }

          if (at === 'EVIDENCE:' || at.startsWith('EVIDENCE:')) {
            const inlineVal = at.slice(9).trim();
            if (inlineVal) {
              evidenceList = inlineVal.split('|').map((s) => s.trim()).filter(Boolean);
              lineIdx++;
            } else {
              lineIdx++;
              const evLines: string[] = [];
              while (lineIdx < lines.length) {
                const evl = lines[lineIdx]!;
                const evt = evl.text.trim();
                if (evt === '' || evt === '[/ACTIVITY]') {
                  break;
                }
                evLines.push(evt);
                lineIdx++;
              }
              evidenceList = evLines.join('\n').split('\n').map((s) => s.trim()).filter(Boolean);
            }
            continue;
          }

          const colonIdx = actLine.text.indexOf(':');
          if (colonIdx !== -1) {
            const k = actLine.text.slice(0, colonIdx).trim();
            const v = actLine.text.slice(colonIdx + 1).trim();

            if (!allowedKeys.has(k)) {
              addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}' in ACTIVITY`, actLine.startOffset, actLine.endOffset);
            } else if (scalarFields[k]) {
              addIssue('PARSE_DUPLICATE_FIELD', `Duplicate field '${k}' in ACTIVITY`, actLine.startOffset, actLine.endOffset);
            } else {
              scalarFields[k] = {
                value: v,
                range: locator.range(actLine.startOffset, actLine.endOffset),
              };
            }
          }
          lineIdx++;
        }

        if (!closed) {
          addIssue('PARSE_UNCLOSED_SECTION', `Unclosed [ACTIVITY ${actSlug}]`, actStartOffset, actStartOffset + 10);
        }

        const actEndOffset = lineIdx > 0 ? lines[lineIdx - 1]!.fullEndOffset : actStartOffset;
        const skills = scalarFields['skills']?.value
          ? scalarFields['skills'].value.split('|').map((s) => s.trim()).filter(Boolean)
          : [];
        const contentRefs = scalarFields['content_refs']?.value
          ? scalarFields['content_refs'].value.split('|').map((s) => s.trim()).filter(Boolean)
          : [];
        const languageBlockRefs = scalarFields['language_block_refs']?.value
          ? scalarFields['language_block_refs'].value.split('|').map((s) => s.trim()).filter(Boolean)
          : [];

        activities.push({
          kind: 'activity',
          range: locator.range(actStartOffset, actEndOffset),
          slug: actSlug,
          learningBlock: scalarFields['learning_block']?.value || '',
          activityType: scalarFields['activity_type']?.value || '',
          responseType: scalarFields['response_type']?.value || '',
          skills,
          contentRefs,
          languageBlockRefs,
          audioRef: scalarFields['audio_ref']?.value,
          question: questionText,
          options,
          answer: scalarFields['answer']?.value,
          explanation: explanationText,
          evidence: evidenceList,
          rubric: scalarFields['rubric']?.value,
          prompt: scalarFields['prompt']?.value,
        });
      } else {
        addIssue('PARSE_UNKNOWN_SECTION', `Unknown section type '[${sectionType}]'`, line.startOffset, line.endOffset);
      }
    } else {
      addIssue('PARSE_UNEXPECTED_CONTENT', `Unexpected content outside section: '${trimmed}'`, line.startOffset, line.endOffset);
      lineIdx++;
    }
  }

  function parseScalarSection(allowedKeys: string[]): Record<string, { value: string; range: SourceRange }> {
    const fields: Record<string, { value: string; range: SourceRange }> = {};
    const allowed = new Set(allowedKeys);

    while (lineIdx < lines.length) {
      const line = lines[lineIdx]!;
      const trimmed = line.text.trim();

      if (trimmed === '') {
        lineIdx++;
        continue;
      }

      if (trimmed.startsWith('[')) {
        if (trimmed === '[/LESSON]') {
          lineIdx++;
          break;
        }
        // Next section started
        break;
      }

      const colonIdx = line.text.indexOf(':');
      if (colonIdx === -1) {
        addIssue('PARSE_SYNTAX_ERROR', `Expected key: value, got '${trimmed}'`, line.startOffset, line.endOffset);
        lineIdx++;
        continue;
      }

      const k = line.text.slice(0, colonIdx).trim();
      const v = line.text.slice(colonIdx + 1).trim();

      if (!allowed.has(k)) {
        addIssue('PARSE_UNKNOWN_FIELD', `Unknown field '${k}'`, line.startOffset, line.endOffset);
      } else if (fields[k]) {
        addIssue('PARSE_DUPLICATE_FIELD', `Duplicate field '${k}'`, line.startOffset, line.endOffset);
      } else {
        fields[k] = {
          value: v,
          range: locator.range(line.startOffset, line.endOffset),
        };
      }
      lineIdx++;
    }

    return fields;
  }

  // Sort issues in source order
  issues.sort((a, b) => a.range.start.offset - b.range.start.offset);

  const document: LessonDocumentNode = {
    kind: 'document',
    range: locator.range(0, len),
    formatVersion,
    lesson,
    wordBanks,
    contents,
    audioScripts,
    activities,
  };

  return { document, issues };
}
