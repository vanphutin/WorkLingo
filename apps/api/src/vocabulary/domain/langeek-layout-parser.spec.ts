import { describe, expect, it } from 'vitest';
import { parseLanGeekLayout } from './langeek-layout-parser.js';
import type { LayoutDocument, LayoutPage, LayoutWord } from './layout-types.js';

const word = (text: string, x0: number, top: number, height = 10, width = 35): LayoutWord => ({ text, x0, x1: x0 + width, top, bottom: top + height });
const rules = (ys: number[]) => ys.flatMap(y => [[18, 83], [83.5, 208], [208.5, 315], [315.5, 599]].map(([x0, x1]) => ({ x0: x0!, x1: x1!, y })));
const page = (pageIndex: number, words: LayoutWord[], ys: number[]): LayoutPage & { horizontalRules: ReturnType<typeof rules> } => ({ pageIndex, width: 612, height: 792, words, horizontalRules: rules(ys) });
const header = [word('No.', 40, 45), word('Word', 130, 45), word('Pronunciation', 230, 40, 9, 60), word('(AmE)', 245, 54, 9), word('Definition', 425, 45, 12, 60)];
const topic = [word('Synthetic', 250, 90, 20, 95), word('tools', 350, 90, 20, 55)];
const row = (ordinal: number, top: number, form = 'fixture') => [word(String(ordinal), 46, top), word(form, 120, top), word('(n.)', 158, top + 4, 6, 10), word('/test/', 240, top, 9), word('Independent', 320, top, 9, 60)];
const document = (pages: LayoutDocument['pages']): LayoutDocument => ({ documentSha256: 'a'.repeat(64), pageCount: pages.length, cefrLevel: 'B2', pages });

describe('LanGeek ruled PDF layout (synthetic content)', () => {
  it('classifies cover/contents and extracts inline POS from ruled cells without source loss', () => {
    const input = document([page(0, [word('English B2 Wordlist', 120, 120, 30, 300)], []), page(1, [word('Table of Contents', 200, 40, 16, 180), word('Synthetic tools', 30, 80, 10, 120), word('3', 585, 80, 10, 8)], []), page(2, [...header, ...topic, ...row(1, 135), ...row(2, 165)], [36, 65, 124, 153, 183])]);
    const result = parseLanGeekLayout(input);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ rawWord: 'fixture', rawPos: '(n.)', normalizedPos: 'NOUN', pronunciation: '/test/', permittedDefinition: 'Independent', originalTopic: 'Synthetic tools', sourceEntryKey: 'topic-1:1', pageIndex: 2 });
    expect(result.inventory.pages.map(p => p.detectedKeys)).toEqual([[], [], ['topic-1:1', 'topic-1:2']]);
    expect(result.inventory.pages.flatMap(p => p.exceptions)).toEqual([]);
  });
  it('uses rule boundaries when wrapped definitions start above the vertically centred ordinal', () => {
    const input = document([page(0, [...header, ...topic, ...row(1, 135), ...row(2, 170).filter(w => w.x0 < 315), word('First', 320, 160, 9), word('second.', 320, 177, 9)], [36, 65, 124, 153, 194])]);
    expect(parseLanGeekLayout(input).rows[1]?.permittedDefinition).toBe('First\nsecond.');
  });
  it('retains a split row across pages and scopes ordinal resets to distinct topic instances', () => {
    const input = document([page(0, [...header, ...topic, ...row(1, 135)], [36, 65, 124, 153]), page(1, [word('continued.', 320, 45, 9), ...row(2, 80)], [36, 65, 95]), page(2, [...header, ...topic, ...row(1, 135)], [36, 65, 124, 153])]);
    const result = parseLanGeekLayout(input);
    expect(result.rows.map(row => row.sourceEntryKey)).toEqual(['topic-1:1', 'topic-1:2', 'topic-2:1']);
    expect(result.rows[0]?.permittedDefinition).toBe('Independent\ncontinued.');
    expect(result.rows[0]?.locations.map(location => location.pageIndex)).toEqual([0, 1]);
  });
  it('accounts for missing POS, duplicate/gap ordinals and unruled or unclassified content', () => {
    const input = document([page(0, [...header, ...topic, ...row(1, 135).filter(w => w.text !== '(n.)'), ...row(3, 165)], [36, 65, 124, 153, 183]), page(1, [word('Unclassified', 200, 150)], [])]);
    const result = parseLanGeekLayout(input);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ normalizedPos: 'UNKNOWN', warnings: expect.arrayContaining(['UNKNOWN_POS']) });
    expect(result.inventory.pages.flatMap(p => p.exceptions.map(e => e.code))).toEqual(expect.arrayContaining(['UNKNOWN_POS', 'ORDINAL_GAP', 'UNKNOWN_LAYOUT']));
  });
  it('keeps topic headings outside the four-column rules, including a heading at the previous page end', () => {
    const input = document([page(0, [...topic.map(w => ({ ...w, top: 60, bottom: 80 })), ...row(1, 110), word('Next topic', 260, 705, 20, 110)], [94, 124]), page(1, [...row(1, 45)], [36, 65])]);
    const result = parseLanGeekLayout(input);
    expect(result.rows.map(r => [r.originalTopic, r.sourceEntryKey])).toEqual([['Synthetic tools', 'topic-1:1'], ['Next topic', 'topic-2:1']]);
    expect(result.inventory.pages.flatMap(p => p.exceptions)).toEqual([]);
  });
});
