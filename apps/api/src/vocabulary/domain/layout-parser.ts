import { vocabularyManifestSchema, type VocabularyManifest, type VocabularySourceRow } from '@worklingo/contracts';
import type { LayoutColumns, LayoutDocument, LayoutPage, LayoutWord } from './layout-types';

type Column = keyof LayoutColumns;
type Location = VocabularySourceRow['locations'][number];
type PageInventory = VocabularyManifest['inventory']['pages'][number];
interface Topic { key: string; title: string; sequence: number }
interface Line {
  words: LayoutWord[];
  location: Location;
  kind: 'topic' | 'header' | 'footer' | 'content';
  topic: Topic | null;
  ordinals: number[];
}
interface PageScan { page: LayoutPage; lines: Line[]; inventory: PageInventory; known: boolean; printed: string | null }

const columnNames: Column[] = ['number', 'word', 'pos', 'ipa', 'definition'];
const defaultColumns: LayoutColumns = { number: [0, .1], word: [.1, .35], pos: [.35, .5], ipa: [.5, .65], definition: [.65, .95] };
const posAliases: Record<string, VocabularySourceRow['normalizedPos']> = {
  noun: 'NOUN', n: 'NOUN', verb: 'VERB', v: 'VERB', adjective: 'ADJECTIVE', adj: 'ADJECTIVE',
  adverb: 'ADVERB', adv: 'ADVERB', pronoun: 'PRONOUN', pron: 'PRONOUN', preposition: 'PREPOSITION', prep: 'PREPOSITION',
  conjunction: 'CONJUNCTION', conj: 'CONJUNCTION', determiner: 'DETERMINER', det: 'DETERMINER',
  interjection: 'INTERJECTION', interj: 'INTERJECTION', number: 'NUMBER', num: 'NUMBER', phrase: 'PHRASE',
};
const compareWords = (a: LayoutWord, b: LayoutWord) => a.top - b.top || a.x0 - b.x0 || a.bottom - b.bottom || a.x1 - b.x1 || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0);

function validate(document: LayoutDocument, columns: LayoutColumns): void {
  if (!/^[a-f0-9]{64}$/u.test(document.documentSha256) || !['A1', 'A2', 'B1', 'B2', 'C1'].includes(document.cefrLevel)) throw new Error('Unsupported document metadata');
  if (!Number.isInteger(document.pageCount) || document.pageCount < 1 || document.pageCount > 2000 || document.pages.length > document.pageCount) throw new Error('Invalid page count or limit');
  if (document.lineTolerance !== undefined && (!Number.isFinite(document.lineTolerance) || document.lineTolerance < 0 || document.lineTolerance > 5)) throw new Error('Invalid line tolerance');
  let end = 0;
  for (const name of columnNames) {
    const range = columns[name];
    if (!range || range.length !== 2 || !range.every(Number.isFinite) || range[0] < end || range[1] <= range[0] || range[1] > 1) throw new Error('Invalid column geometry');
    end = range[1];
  }
  const seen = new Set<number>();
  let wordCount = 0;
  for (const page of document.pages) {
    if (!Number.isInteger(page.pageIndex) || page.pageIndex < 0 || page.pageIndex >= document.pageCount || seen.has(page.pageIndex)) throw new Error('Invalid page identity');
    seen.add(page.pageIndex);
    if (![page.width, page.height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid page geometry');
    wordCount += page.words.length;
    if (page.words.length > 20000 || wordCount > 1000000) throw new Error('Native word limit exceeded');
    for (const word of page.words) {
      if (typeof word.text !== 'string' || !word.text.trim() || word.text.length > 10000 || ![word.x0, word.x1, word.top, word.bottom].every(Number.isFinite) || word.x0 < 0 || word.top < 0 || word.x1 <= word.x0 || word.bottom <= word.top || word.x1 > page.width || word.bottom > page.height) throw new Error('Invalid word geometry or text');
    }
  }
}

function groupLines(page: LayoutPage, tolerance: number): Line[] {
  const groups: LayoutWord[][] = [];
  for (const word of [...page.words].sort(compareWords)) {
    const previous = groups.at(-1);
    if (previous && Math.abs(word.top - previous[0]!.top) <= tolerance) previous.push(word);
    else groups.push([word]);
  }
  return groups.map(words => {
    words.sort((a, b) => a.x0 - b.x0 || compareWords(a, b));
    return { words, location: { pageIndex: page.pageIndex, bbox: [Math.min(...words.map(word => word.x0)), Math.min(...words.map(word => word.top)), Math.max(...words.map(word => word.x1)), Math.max(...words.map(word => word.bottom))] }, kind: 'content', topic: null, ordinals: [] };
  });
}

function issue(inventory: PageInventory, code: string, location?: Location): void {
  if (inventory.exceptions.length >= 1000) throw new Error('Page exception limit exceeded');
  inventory.exceptions.push({ code, message: code.replaceAll('_', ' ').toLowerCase(), ...(location ? { location } : {}) });
}

function sameTopicTitle(topic: Topic | null, title: string): boolean {
  return topic?.title === title;
}

/** Geometry inventory is built before parsing, without consulting accepted rows. */
function scan(document: LayoutDocument, columns: LayoutColumns): PageScan[] {
  const pages = new Map(document.pages.map(page => [page.pageIndex, page]));
  const scans: PageScan[] = [];
  let topic: Topic | null = null;
  let topicSequence = 0;
  for (let pageIndex = 0; pageIndex < document.pageCount; pageIndex++) {
    const page = pages.get(pageIndex);
    const inventory: PageInventory = { pageIndex, detectedKeys: [], exceptions: [] };
    if (!page) {
      issue(inventory, 'MISSING_PAGE');
      scans.push({ page: { pageIndex, width: 1, height: 1, words: [] }, lines: [], inventory, known: false, printed: null });
      topic = null;
      continue;
    }
    const lines = groupLines(page, document.lineTolerance ?? 2);
    let printed: string | null = null;
    for (const line of lines) {
      const text = line.words.map(word => word.text).join(' ');
      const footer = /^(?:Page\s+)?(\d+)(?:\s+(?:of|\/)\s*\d+)?$/iu.exec(text.trim());
      const startsInNumberColumn = line.location.bbox[0] >= columns.number[0] * page.width && line.location.bbox[0] < columns.number[1] * page.width;
      const center = (line.location.bbox[0] + line.location.bbox[2]) / (2 * page.width);
      if (line.location.bbox[1] >= page.height * .92 && footer && !startsInNumberColumn && center >= .4 && center <= .6) {
        line.kind = 'footer';
        printed = footer[1]!;
      } else if (startsInNumberColumn && /^Topic\s*:/iu.test(text)) line.kind = 'topic';
      else if (startsInNumberColumn && /^(?:Number|No\.?|#)\s+Word\s+(?:POS|Part of speech)\s+(?:IPA|Pronunciation)\s+(?:Definition|Meaning)$/iu.test(text.trim()) && columnNames.every(name => line.words.some(word => word.x0 >= columns[name][0] * page.width && word.x1 <= columns[name][1] * page.width))) line.kind = 'header';
      if (line.kind === 'content') {
        // Anchor enumeration does not depend on recognized POS, form or definition.
        line.ordinals = line.words.filter(word => word.x0 >= columns.number[0] * page.width && word.x0 < columns.number[1] * page.width && /^\d+$/u.test(word.text)).map(word => Number(word.text));
      }
    }
    let firstTopic = true;
    for (const [index, line] of lines.entries()) {
      if (line.kind === 'topic') {
        const title = line.words.map(word => word.text).join(' ').replace(/^Topic\s*:\s*/iu, '');
        const nextOrdinal = lines.slice(index + 1).find(candidate => candidate.kind === 'topic' || candidate.ordinals.length)?.ordinals[0];
        const repeated = firstTopic && pageIndex > 0 && sameTopicTitle(topic, title) && nextOrdinal !== 1;
        if (!repeated) { topicSequence++; topic = { key: `topic-${topicSequence}`, title, sequence: topicSequence }; }
        firstTopic = false;
      }
      if (line.kind === 'content') firstTopic = false;
      line.topic = topic;
      for (const ordinal of line.ordinals) {
        if (inventory.detectedKeys.length >= 1000) throw new Error('Page row limit exceeded');
        inventory.detectedKeys.push(`${topic?.key ?? 'missing-topic'}:${ordinal}`);
      }
    }
    const known = lines.some(line => line.kind === 'header') || document.columns !== undefined;
    if (!page.words.length) issue(inventory, 'OCR_REQUIRED');
    else if (!known) issue(inventory, 'UNKNOWN_LAYOUT');
    if (!known) topic = null;
    scans.push({ page, lines, inventory, known, printed });
  }
  return scans;
}

function splitColumns(line: Line, page: LayoutPage, columns: LayoutColumns): { fields: Record<Column, string>; ambiguous: boolean } {
  const cells: Record<Column, string[]> = { number: [], word: [], pos: [], ipa: [], definition: [] };
  let ambiguous = false;
  for (const word of line.words) {
    const name = columnNames.find(name => word.x0 >= columns[name][0] * page.width && word.x1 <= columns[name][1] * page.width);
    if (name) cells[name].push(word.text);
    else ambiguous = true;
  }
  return { fields: { number: cells.number.join(' '), word: cells.word.join(' '), pos: cells.pos.join(' '), ipa: cells.ipa.join(' '), definition: cells.definition.join(' ') }, ambiguous };
}

export function parseVocabularyLayout(document: LayoutDocument): VocabularyManifest {
  const columns = document.columns ?? defaultColumns;
  validate(document, columns);
  const scans = scan(document, columns);
  const rows: VocabularySourceRow[] = [];
  const ordinals = new Map<string, Set<number>>();
  const lastOrdinal = new Map<string, number>();
  let previous: VocabularySourceRow | null = null;
  let previousBottom = 0;
  for (const { page, lines, inventory, known, printed } of scans) {
    if (!known || !page.words.length) previous = null;
    for (const line of lines) {
      if (line.kind === 'topic') {
        if (previous?.topicInstanceKey !== line.topic?.key) previous = null;
        continue;
      }
      if (line.kind !== 'content') continue;
      const { fields, ambiguous } = splitColumns(line, page, columns);
      if (ambiguous) issue(inventory, 'AMBIGUOUS_COLUMNS', line.location);
      if (line.ordinals.length) {
        previous = null;
        const ordinal = line.ordinals[0]!;
        if (!line.topic) issue(inventory, 'MISSING_TOPIC', line.location);
        const topicKey = line.topic?.key ?? 'missing-topic';
        const seen = ordinals.get(topicKey) ?? new Set<number>();
        if (seen.has(ordinal)) issue(inventory, 'DUPLICATE_ORDINAL', line.location);
        else if (ordinal !== (lastOrdinal.get(topicKey) ?? 0) + 1) issue(inventory, 'ORDINAL_GAP', line.location);
        seen.add(ordinal);
        ordinals.set(topicKey, seen);
        lastOrdinal.set(topicKey, ordinal);
        if (ambiguous || line.ordinals.length !== 1 || ordinal < 1 || !Number.isSafeInteger(ordinal) || !fields.word.trim() || !fields.pos.trim() || fields.number !== String(ordinal)) {
          issue(inventory, 'AMBIGUOUS_ROW', line.location);
          continue;
        }
        if (!line.topic || !known) continue;
        const posKey = fields.pos.trim().toLowerCase().replace(/\.$/u, '');
        const normalizedPos = Object.hasOwn(posAliases, posKey) ? posAliases[posKey]! : 'UNKNOWN';
        if (normalizedPos === 'UNKNOWN') issue(inventory, 'UNKNOWN_POS', line.location);
        previous = {
          sourceEntryKey: `${line.topic.key}:${ordinal}`, topicInstanceKey: line.topic.key, originalTopic: line.topic.title,
          topicSequence: line.topic.sequence, rowOrdinal: ordinal, pageIndex: page.pageIndex, printedPageNumber: printed,
          locations: [line.location], rawWord: fields.word, parsedWord: fields.word.normalize('NFC').trim(), rawPos: fields.pos,
          normalizedPos, cefrLevel: document.cefrLevel, pronunciation: fields.ipa || null, permittedDefinition: fields.definition || null,
          extractionConfidence: normalizedPos === 'UNKNOWN' ? .5 : 1, warnings: normalizedPos === 'UNKNOWN' ? ['UNKNOWN_POS'] : [],
        };
        rows.push(previous);
        previousBottom = line.location.bbox[3];
      } else {
        const lastLocation = previous?.locations.at(-1);
        const close = lastLocation && (lastLocation.pageIndex === page.pageIndex ? line.location.bbox[1] - previousBottom <= 20 : lastLocation.pageIndex + 1 === page.pageIndex);
        // POS/number-bearing fragments may be dropped rows, never wrapped fields.
        if (!previous || !known || ambiguous || fields.number || fields.pos || !close || previous.topicInstanceKey !== line.topic?.key) {
          issue(inventory, 'UNRESOLVED_FRAGMENT', line.location);
          previous = null;
          continue;
        }
        if (fields.word) { previous.rawWord += `\n${fields.word}`; previous.parsedWord = previous.rawWord.normalize('NFC').trim(); }
        if (fields.ipa) previous.pronunciation = [previous.pronunciation, fields.ipa].filter(value => value !== null).join('\n');
        if (fields.definition) previous.permittedDefinition = [previous.permittedDefinition, fields.definition].filter(value => value !== null).join('\n');
        previous.locations.push(line.location);
        previousBottom = line.location.bbox[3];
      }
    }
  }
  return vocabularyManifestSchema.parse({ documentSha256: document.documentSha256, pageCount: document.pageCount, cefrLevel: document.cefrLevel, parserVersion: 'native-layout/1', inventory: { pages: scans.map(scan => scan.inventory) }, rows });
}
