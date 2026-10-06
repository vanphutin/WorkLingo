import { describe, expect, it } from 'vitest';

import { offsetForPosition } from './source-position';

describe('offsetForPosition', () => {
  it('maps line 1 column 1 to offset 0', () => {
    const text = 'FORMAT: WorkLingoLesson/1.0';
    expect(offsetForPosition(text, { line: 1, column: 1 })).toBe(0);
  });

  it('maps column on line 1 correctly', () => {
    const text = 'FORMAT: WorkLingoLesson/1.0';
    expect(offsetForPosition(text, { line: 1, column: 9 })).toBe(8);
  });

  it('handles LF line endings across multiple lines', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    // Line 2, Col 1 -> after "Line 1\n" (7 chars) -> offset 7
    expect(offsetForPosition(text, { line: 2, column: 1 })).toBe(7);
    // Line 3, Col 6 -> offset 7 + 7 + 5 = 19
    expect(offsetForPosition(text, { line: 3, column: 6 })).toBe(19);
  });

  it('handles CRLF line endings without offset drift', () => {
    const text = 'Line 1\r\nLine 2\r\nLine 3';
    // Line 1 is 6 chars + \r\n (2 chars) = 8 chars
    expect(offsetForPosition(text, { line: 2, column: 1 })).toBe(8);
    // Line 2 start (8) + 6 + 2 = 16 for Line 3
    expect(offsetForPosition(text, { line: 3, column: 1 })).toBe(16);
  });

  it('handles Vietnamese diacritics and unicode text', () => {
    const text = 'Xin chào\nGiải quyết vấn đề\nKết thúc';
    // 'Xin chào\n' length is 9 UTF-16 code units
    expect(offsetForPosition(text, { line: 2, column: 1 })).toBe(9);
    // 'Giải ' is 5 code units -> Col 6 on line 2 = 9 + 5 = 14
    expect(offsetForPosition(text, { line: 2, column: 6 })).toBe(14);
  });

  it('handles emoji surrogate pairs matching textarea selection offsets', () => {
    // 🎧 is surrogate pair (2 UTF-16 code units)
    const text = 'Audio: 🎧\nListen carefully';
    // 'Audio: 🎧\n' = 7 + 2 + 1 = 10 code units
    expect(offsetForPosition(text, { line: 2, column: 1 })).toBe(10);
  });

  it('clamps to text bounds when position is past EOF', () => {
    const text = 'Short text';
    expect(offsetForPosition(text, { line: 10, column: 5 })).toBe(text.length);
  });
});
