import { vocabularyManifestSchema, type VocabularyManifest, type VocabularySourceRow } from '@worklingo/contracts';
import { validateLayoutDocument } from './layout-parser.js';
import type { LayoutDocument, LayoutPage, LayoutWord } from './layout-types.js';

type Location = VocabularySourceRow['locations'][number];
type Inventory = VocabularyManifest['inventory']['pages'][number];
type Rule = { y: number; segments: { x0: number; x1: number }[] };
const posAliases: Record<string, VocabularySourceRow['normalizedPos']> = {
  n: 'NOUN', v: 'VERB', adj: 'ADJECTIVE', adv: 'ADVERB', pron: 'PRONOUN', prep: 'PREPOSITION',
  conj: 'CONJUNCTION', det: 'DETERMINER', intj: 'INTERJECTION', int: 'INTERJECTION', num: 'NUMBER', phr: 'PHRASE', phrase: 'PHRASE', sentence: 'PHRASE',
};

function text(words: readonly LayoutWord[]): string {
  const lines: LayoutWord[][] = [];
  for (const word of [...words].sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
    const last = lines.at(-1);
    if (last && Math.abs(last[0]!.top - word.top) <= 2) last.push(word);
    else lines.push([word]);
  }
  return lines.map(line => line.sort((a, b) => a.x0 - b.x0).map(word => word.text).join(' ')).join('\n');
}
function bounds(pageIndex: number, words: readonly LayoutWord[]): Location {
  return { pageIndex, bbox: [Math.min(...words.map(w => w.x0)), Math.min(...words.map(w => w.top)), Math.max(...words.map(w => w.x1)), Math.max(...words.map(w => w.bottom))] };
}
function issue(inventory: Inventory, code: string, location?: Location): void {
  inventory.exceptions.push({ code, message: code.replaceAll('_', ' ').toLowerCase(), ...(location ? { location } : {}) });
}
function tableRules(page: LayoutPage): Rule[] {
  const rules = page.horizontalRules ?? [];
  if (rules.length > 20000) throw new Error('Native rule limit exceeded');
  const groups: Rule[] = [];
  for (const rule of [...rules].sort((a, b) => a.y - b.y || a.x0 - b.x0)) {
    if (![rule.x0, rule.x1, rule.y].every(Number.isFinite) || rule.x0 < 0 || rule.x1 <= rule.x0 || rule.x1 > page.width || rule.y < 0 || rule.y > page.height) throw new Error('Invalid native rule geometry');
    if (rule.y < 30 || rule.y > page.height * .95 || rule.x1 - rule.x0 < 20) continue;
    const last = groups.at(-1);
    if (last && Math.abs(last.y - rule.y) <= 1) last.segments.push(rule);
    else groups.push({ y: rule.y, segments: [rule] });
  }
  return groups.filter(group => group.segments.length === 4 && group.segments[0]!.x0 < page.width * .05 && group.segments[3]!.x1 > page.width * .95 && group.segments.every((segment, i) => i === 0 || Math.abs(segment.x0 - group.segments[i - 1]!.x1) <= 1));
}

/** Explicit adapter for the four-column, ruled LanGeek PDFs; unknown content blocks publication. */
export function parseLanGeekLayout(document: LayoutDocument): VocabularyManifest {
  validateLayoutDocument(document);
  const rows: VocabularySourceRow[] = [];
  const pages: Inventory[] = [];
  let topic: { key: string; title: string; sequence: number } | undefined;
  let sequence = 0;
  let lastOrdinal = 0;
  let previous: VocabularySourceRow | undefined;
  for (let index = 0; index < document.pageCount; index++) {
    const inventory: Inventory = { pageIndex: index, detectedKeys: [], exceptions: [] };
    pages.push(inventory);
    const page = document.pages.find(p => p.pageIndex === index);
    if (!page) { issue(inventory, 'MISSING_PAGE'); previous = undefined; continue; }
    const rules = tableRules(page);
    if (rules.length < 2) {
      const content = text(page.words);
      const cover = index === 0 && /English[\s\S]*Wordlist/iu.test(content);
      const contents = sequence === 0 && /Table of Contents|\.{8}/u.test(content);
      if (!cover && !contents) issue(inventory, page.words.length ? 'UNKNOWN_LAYOUT' : 'OCR_REQUIRED');
      previous = undefined;
      continue;
    }
    const consumed = new Set<LayoutWord>();
    let pageHasRow = false;
    const printed = page.words.find(w => w.top > page.height * .95 && w.x0 > page.width * .94 && /^\d+$/u.test(w.text))?.text ?? null;
    const bands = rules.slice(0, -1).map((upper, band) => ({ upper, words: page.words.filter(w => (w.top + w.bottom) / 2 > upper.y && (w.top + w.bottom) / 2 < rules[band + 1]!.y) }));
    const outsideTitles = page.words.filter(w => w.bottom - w.top >= 17 && w.top >= 30 && w.bottom < page.height * .95 && !bands.some(b => b.words.includes(w)));
    const titleLines: LayoutWord[][] = [];
    for (const word of outsideTitles.sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
      const last = titleLines.at(-1);
      if (last && Math.abs(word.top - last[0]!.top) <= 2) last.push(word);
      else titleLines.push([word]);
    }
    for (const words of titleLines) bands.push({ upper: { y: words[0]!.top, segments: [] }, words });
    bands.sort((a, b) => a.upper.y - b.upper.y);
    for (const { upper, words } of bands) {
      if (!words.length) continue;
      words.forEach(w => consumed.add(w));
      const location = bounds(index, words);
      if (['No.', 'Word', 'Pronunciation', 'Definition'].every(label => words.some(w => w.text === label))) continue;
      const titles = words.filter(w => w.bottom - w.top >= 17);
      if (titles.length) {
        sequence++;
        topic = { key: `topic-${sequence}`, sequence, title: text(titles) };
        previous = undefined;
        lastOrdinal = 0;
        if (titles.length !== words.length) issue(inventory, 'AMBIGUOUS_TOPIC', location);
        continue;
      }
      const cells = upper.segments.map(segment => words.filter(w => (w.x0 + w.x1) / 2 >= segment.x0 - .5 && (w.x0 + w.x1) / 2 <= segment.x1 + .5));
      const anchors = cells[0]!.filter(w => /^\d+$/u.test(w.text));
      if (!anchors.length) {
        if (!pageHasRow && previous && previous.locations.at(-1)?.pageIndex === index - 1 && !cells[0]!.length && cells.flat().length === words.length) {
          const form = text(cells[1]!);
          if (form) { previous.rawWord += `\n${form}`; previous.parsedWord = previous.rawWord.normalize('NFC').trim(); }
          const ipa = text(cells[2]!);
          if (ipa) previous.pronunciation = [previous.pronunciation, ipa].filter(Boolean).join('\n');
          const definition = text(cells[3]!);
          if (definition) previous.permittedDefinition = [previous.permittedDefinition, definition].filter(Boolean).join('\n');
          previous.locations.push(location);
        } else { issue(inventory, 'UNRESOLVED_FRAGMENT', location); previous = undefined; }
        continue;
      }
      for (const anchor of anchors) inventory.detectedKeys.push(`${topic?.key ?? 'missing-topic'}:${Number(anchor.text)}`);
      if (anchors.length !== 1 || cells[0]!.length !== 1) { issue(inventory, 'AMBIGUOUS_ROW', location); previous = undefined; continue; }
      const ordinal = Number(anchors[0]!.text);
      if (!topic) { issue(inventory, 'MISSING_TOPIC', location); previous = undefined; continue; }
      if (ordinal !== lastOrdinal + 1) issue(inventory, ordinal <= lastOrdinal ? 'DUPLICATE_ORDINAL' : 'ORDINAL_GAP', location);
      lastOrdinal = ordinal;
      let rawPos = text(cells[1]!.filter(w => w.bottom - w.top <= 7.5));
      let rawWord = text(cells[1]!.filter(w => w.bottom - w.top > 7.5));
      if (!rawPos) {
        const combined = /^(.*?)\s+(\([^()]+\))$/su.exec(rawWord);
        if (combined) { rawWord = combined[1]!; rawPos = combined[2]!; }
      }
      const posKey = rawPos.toLowerCase().replace(/[().\s]/gu, '');
      const normalizedPos = Object.hasOwn(posAliases, posKey) ? posAliases[posKey]! : 'UNKNOWN';
      const pronunciation = text(cells[2]!) || null;
      const definition = text(cells[3]!) || null;
      const warnings: string[] = [];
      if (normalizedPos === 'UNKNOWN') warnings.push('UNKNOWN_POS');
      if (!rawWord) warnings.push('MISSING_FORM');
      if (!pronunciation) warnings.push('MISSING_PRONUNCIATION');
      if (!definition) warnings.push('MISSING_DEFINITION');
      if (cells.flat().length !== words.length) warnings.push('AMBIGUOUS_COLUMNS');
      warnings.forEach(code => issue(inventory, code, location));
      if (!rawWord) { previous = undefined; continue; }
      previous = {
        sourceEntryKey: `${topic.key}:${ordinal}`, topicInstanceKey: topic.key, originalTopic: topic.title,
        topicSequence: sequence, rowOrdinal: ordinal, pageIndex: index, printedPageNumber: printed,
        locations: [location], rawWord, parsedWord: rawWord.normalize('NFC').trim(), rawPos,
        normalizedPos, cefrLevel: document.cefrLevel, pronunciation, permittedDefinition: definition,
        extractionConfidence: warnings.length ? .5 : 1, warnings,
      };
      rows.push(previous);
      pageHasRow = true;
    }
    const unclassified = page.words.filter(w => !consumed.has(w) && w.top >= 30 && w.bottom < page.height * .95);
    if (unclassified.length) issue(inventory, 'UNRESOLVED_FRAGMENT', bounds(index, unclassified));
  }
  return vocabularyManifestSchema.parse({ documentSha256: document.documentSha256, pageCount: document.pageCount, cefrLevel: document.cefrLevel, parserVersion: 'langeek-ruled/1', inventory: { pages }, rows });
}
