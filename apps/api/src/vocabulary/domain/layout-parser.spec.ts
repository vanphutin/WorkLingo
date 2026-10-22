import { describe, expect, it } from 'vitest';
import { vocabularyManifestSchema } from '@worklingo/contracts';
import { parseVocabularyLayout } from './layout-parser';
import type { LayoutColumns, LayoutDocument, LayoutWord } from './layout-types';

const word = (text: string, x0: number, top: number, width = 40): LayoutWord => ({ text, x0, x1: x0 + width, top, bottom: top + 10 });
const heading = (text = 'Topic: Synthetic tools', top = 20) => [word(text, 10, top, 180)];
const header = () => ['Number', 'Word', 'POS', 'IPA', 'Definition'].map((text, i) => word(text, [10, 70, 220, 310, 410][i]!, 45));
const row = (n: number, form: string, pos: string, top = 70) => [word(String(n), 10, top, 10), word(form, 70, top, 120), word(pos, 220, top), word('/test/', 310, top, 60), word('synthetic meaning', 410, top, 120)];
const document = (words: LayoutWord[], extra: Partial<LayoutDocument> = {}): LayoutDocument => ({ documentSha256: 'a'.repeat(64), pageCount: 1, cefrLevel: 'A1', pages: [{ pageIndex: 0, width: 600, height: 800, words }], ...extra });
const exceptions = (result: ReturnType<typeof parseVocabularyLayout>) => result.inventory.pages.flatMap(page => page.exceptions.map(item => item.code));

describe('parseVocabularyLayout (entirely synthetic geometry)', () => {
  it.each(['A1', 'A2', 'B1', 'B2', 'C1'] as const)('produces a contract-valid %s manifest without merging POS homographs', cefrLevel => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'test', 'noun'), ...row(2, 'test', 'verb', 100)], { cefrLevel }));
    expect(result.rows.map(item => [item.sourceEntryKey, item.normalizedPos, item.cefrLevel])).toEqual([['topic-1:1', 'NOUN', cefrLevel], ['topic-1:2', 'VERB', cefrLevel]]);
    expect(result.inventory.pages[0]?.detectedKeys).toEqual(['topic-1:1', 'topic-1:2']);
    expect(exceptions(result)).toEqual([]);
    expect(vocabularyManifestSchema.safeParse(result).success).toBe(true);
  });

  it('preserves decomposed raw text, multiword forms, IPA and wrapped fields with conservative NFC', () => {
    const words = [...heading(), ...header(), ...row(1, 'cafe\u0301 test', 'phrase'), word('continued form', 70, 84, 120), word('more meaning', 410, 84, 100)];
    words.find(item => item.text === '/test/')!.text = '/kæ.feɪ/';
    const result = parseVocabularyLayout(document(words));
    expect(result.rows[0]).toMatchObject({ rawWord: 'cafe\u0301 test\ncontinued form', parsedWord: 'café test\ncontinued form', rawPos: 'phrase', normalizedPos: 'PHRASE', pronunciation: '/kæ.feɪ/', permittedDefinition: 'synthetic meaning\nmore meaning' });
    expect(result.rows[0]?.locations).toHaveLength(2);
  });

  it('continues across pages, ignores recognized repeated headers/footers, and retains every location', () => {
    const input = document([], { pageCount: 2, pages: [
      { pageIndex: 0, width: 600, height: 800, words: [...heading(), ...header(), ...row(1, 'test', 'noun'), word('Page 1', 270, 780)] },
      { pageIndex: 1, width: 600, height: 800, words: [...heading(), ...header(), word('continued meaning', 410, 70, 120), ...row(2, 'test two', 'noun', 100), word('Page 2', 270, 780)] },
    ] });
    const result = parseVocabularyLayout(input);
    expect(result.rows.map(item => item.sourceEntryKey)).toEqual(['topic-1:1', 'topic-1:2']);
    expect(result.rows[0]?.permittedDefinition).toBe('synthetic meaning\ncontinued meaning');
    expect(result.rows[0]?.locations.map(item => item.pageIndex)).toEqual([0, 1]);
    expect(result.rows[0]?.printedPageNumber).toBe('1');
    expect(exceptions(result)).toEqual([]);
    expect(result.inventory.pages.map(page => page.detectedKeys)).toEqual([['topic-1:1'], ['topic-1:2']]);
  });

  it('scopes ordinal resets to new topic instances, even when titles repeat', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'same', 'noun'), ...heading('Topic: Synthetic tools', 110), ...row(1, 'same', 'noun', 140), ...heading('Topic: Other tools', 170), ...row(1, 'same', 'noun', 200)]));
    expect(result.rows.map(item => [item.topicInstanceKey, item.rowOrdinal, item.topicSequence])).toEqual([['topic-1', 1, 1], ['topic-2', 1, 2], ['topic-3', 1, 3]]);
  });

  it('enumerates malformed candidates independently so missing parsed rows produce a count mismatch', () => {
    const malformed = row(2, '', 'noun', 100).filter(item => item.text !== '');
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'test', 'noun'), ...malformed]));
    expect(result.inventory.pages[0]?.detectedKeys).toEqual(['topic-1:1', 'topic-1:2']);
    expect(result.rows).toHaveLength(1);
    expect(exceptions(result)).toContain('AMBIGUOUS_ROW');
    expect(vocabularyManifestSchema.safeParse(result).success).toBe(true);
  });

  it('reports duplicate ordinals, gaps, unknown POS, stray fragments and column crossings explicitly', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'alien'), ...row(1, 'second', 'noun', 100), ...row(3, 'third', 'noun', 130), word('crossing', 200, 160, 50), word('unplaced', 590, 190, 9)]));
    expect(exceptions(result)).toEqual(expect.arrayContaining(['UNKNOWN_POS', 'DUPLICATE_ORDINAL', 'ORDINAL_GAP', 'AMBIGUOUS_COLUMNS', 'UNRESOLVED_FRAGMENT']));
    expect(result.inventory.pages[0]?.detectedKeys).toEqual(['topic-1:1', 'topic-1:1', 'topic-1:3']);
  });

  it('does not attach continuations to an invalid candidate or across a topic boundary', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), word('2', 10, 100, 10), word('orphan meaning', 410, 114, 120), ...heading('Topic: Other tools', 140), word('orphan again', 410, 170, 100)]));
    expect(result.rows[0]?.permittedDefinition).toBe('synthetic meaning');
    expect(exceptions(result).filter(code => code === 'UNRESOLVED_FRAGMENT')).toHaveLength(2);
  });

  it.each([{ words: [] }, { words: [word('unrecognized layout', 10, 80, 160)] }])('reports OCR/unknown native layouts instead of empty success', ({ words }) => {
    const result = parseVocabularyLayout(document(words));
    expect(exceptions(result)).toContain(words.length ? 'UNKNOWN_LAYOUT' : 'OCR_REQUIRED');
    expect(vocabularyManifestSchema.safeParse(result).success).toBe(true);
  });

  it('accounts for missing pages and topicless candidates', () => {
    const result = parseVocabularyLayout(document([...header(), ...row(1, 'test', 'noun')], { pageCount: 2 }));
    expect(exceptions(result)).toEqual(expect.arrayContaining(['MISSING_TOPIC', 'MISSING_PAGE']));
    expect(result.inventory.pages).toHaveLength(2);
    expect(result.rows).toEqual([]);
  });

  it('accepts explicit alternative fractional columns and is invariant under input order', () => {
    const columns: LayoutColumns = { number: [0, .1], word: [.1, .35], pos: [.35, .5], ipa: [.5, .65], definition: [.65, 1] };
    const words = [...heading(), ...row(1, 'Ｆｏｏ', 'n.')];
    const input = document(words, { columns });
    const result = parseVocabularyLayout(input);
    expect(result.rows[0]?.parsedWord).toBe('Ｆｏｏ');
    expect(result.rows[0]?.normalizedPos).toBe('NOUN');
    expect(parseVocabularyLayout(document([...words].reverse(), { columns }))).toEqual(result);
  });

  it('rejects invalid geometry, page identities and oversized native input explicitly', () => {
    expect(() => parseVocabularyLayout(document([word('invalid', -1, 10)]))).toThrow(/geometry/i);
    expect(() => parseVocabularyLayout(document([], { pages: [{ pageIndex: 1, width: 600, height: 800, words: [] }] }))).toThrow(/page/i);
    expect(() => parseVocabularyLayout(document(Array.from({ length: 20001 }, () => word('x', 10, 10))))).toThrow(/limit/i);
  });

  it('does not swallow an unnumbered row or distant fragment as a continuation', () => {
    const unnumbered = row(2, 'lost number', 'verb', 100).slice(1);
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), ...unnumbered, word('distant', 410, 300)]));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.permittedDefinition).toBe('synthetic meaning');
    expect(exceptions(result).filter(code => code === 'UNRESOLVED_FRAGMENT')).toHaveLength(2);
  });

  it('breaks continuation state over missing, OCR and unknown pages', () => {
    for (const middle of [undefined, [], [word('unknown', 10, 80)]]) {
      const input = document([], { pageCount: 3, pages: [
        { pageIndex: 0, width: 600, height: 800, words: [...heading(), ...header(), ...row(1, 'first', 'noun')] },
        ...(middle ? [{ pageIndex: 1, width: 600, height: 800, words: middle }] : []),
        { pageIndex: 2, width: 600, height: 800, words: [...heading(), ...header(), word('orphan', 410, 70)] },
      ] });
      const result = parseVocabularyLayout(input);
      expect(result.rows[0]?.locations).toHaveLength(1);
      expect(exceptions(result)).toContain('UNRESOLVED_FRAGMENT');
    }
  });

  it('records both duplicate source occurrences without silently deduplicating', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'same', 'noun'), ...row(1, 'same', 'noun', 100)]));
    expect(result.rows.map(item => item.sourceEntryKey)).toEqual(['topic-1:1', 'topic-1:1']);
    expect(exceptions(result)).toContain('DUPLICATE_ORDINAL');
    expect(result.inventory.pages[0]?.exceptions.find(item => item.code === 'DUPLICATE_ORDINAL')?.location?.bbox[1]).toBe(100);
  });

  it('starts a new instance when a repeated page heading resets numbering', () => {
    const result = parseVocabularyLayout(document([], { pageCount: 2, pages: [0, 1].map(pageIndex => ({ pageIndex, width: 600, height: 800, words: [...heading(), ...header(), ...row(1, 'same', 'noun')] })) }));
    expect(result.rows.map(item => item.sourceEntryKey)).toEqual(['topic-1:1', 'topic-2:1']);
  });

  it('rejects invalid metadata, overlapping columns and duplicate page identities', () => {
    expect(() => parseVocabularyLayout(document([], { documentSha256: 'bad' }))).toThrow();
    expect(() => parseVocabularyLayout(document([], { cefrLevel: 'C2' }))).toThrow();
    expect(() => parseVocabularyLayout(document([], { lineTolerance: -1 }))).toThrow();
    const page = { pageIndex: 0, width: 600, height: 800, words: [] };
    expect(() => parseVocabularyLayout(document([], { pages: [page, page] }))).toThrow();
    expect(() => parseVocabularyLayout(document([], { columns: { number: [0, .2], word: [.1, .35], pos: [.35, .5], ipa: [.5, .65], definition: [.65, 1] } }))).toThrow();
  });

  it('does not hide bottom-of-page ordinal fragments as bare page-number footers', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), word('2', 10, 780, 10)]));
    expect(result.inventory.pages[0]?.detectedKeys).toEqual(['topic-1:1', 'topic-1:2']);
    expect(exceptions(result)).toContain('AMBIGUOUS_ROW');
  });

  it('does not classify a definition continuation containing Topic as a heading', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), word('Topic: synthetic label', 410, 84, 140)]));
    expect(result.rows[0]?.permittedDefinition).toBe('synthetic meaning\nTopic: synthetic label');
    expect(exceptions(result)).toEqual([]);
  });

  it('does not interpret header labels in an ordinary row as a repeated table header', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), word('Number Word POS IPA Definition', 410, 84, 150)]));
    expect(result.rows[0]?.permittedDefinition).toBe('synthetic meaning\nNumber Word POS IPA Definition');
  });

  it('treats a same-title heading after page content as a new topic boundary', () => {
    const result = parseVocabularyLayout(document([], { pageCount: 2, pages: [
      { pageIndex: 0, width: 600, height: 800, words: [...heading(), ...header(), ...row(1, 'first', 'noun')] },
      { pageIndex: 1, width: 600, height: 800, words: [...header(), ...row(2, 'second', 'noun'), ...heading('Topic: Synthetic tools', 140), ...row(3, 'third', 'noun', 170)] },
    ] }));
    expect(result.rows.map(item => item.sourceEntryKey)).toEqual(['topic-1:1', 'topic-1:2', 'topic-2:3']);
    expect(exceptions(result)).toContain('ORDINAL_GAP');
  });

  it('flags a bottom-of-page numeric definition fragment away from the centered footer', () => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', 'noun'), word('42', 410, 780, 20)]));
    expect(exceptions(result)).toContain('UNRESOLVED_FRAGMENT');
    expect(result.rows[0]?.printedPageNumber).toBeNull();
  });

  it.each(['constructor', '__proto__'])('reports prototype-like POS %s as unknown without losing the row', rawPos => {
    const result = parseVocabularyLayout(document([...heading(), ...header(), ...row(1, 'first', rawPos)]));
    expect(result.rows[0]?.normalizedPos).toBe('UNKNOWN');
    expect(result.rows[0]?.rawPos).toBe(rawPos);
    expect(exceptions(result)).toContain('UNKNOWN_POS');
  });
});
