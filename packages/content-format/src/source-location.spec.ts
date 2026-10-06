import { describe, expect, it } from 'vitest';
import { createSourceLocator } from './source-location.js';

describe('SourceLocator', () => {
  it('returns line 1, column 1, offset 0 for offset 0 in empty or non-empty source', () => {
    const locatorEmpty = createSourceLocator('');
    expect(locatorEmpty.positionAt(0)).toEqual({ line: 1, column: 1, offset: 0 });

    const locatorText = createSourceLocator('FORMAT: WorkLingoLesson/1.0');
    expect(locatorText.positionAt(0)).toEqual({ line: 1, column: 1, offset: 0 });
  });

  it('rejects offsets outside 0..source.length', () => {
    const locator = createSourceLocator('abc');
    expect(() => locator.positionAt(-1)).toThrow(/out of bounds/i);
    expect(() => locator.positionAt(4)).toThrow(/out of bounds/i);
    // Boundary: offset equal to source.length is valid (EOF position)
    expect(locator.positionAt(3)).toEqual({ line: 1, column: 4, offset: 3 });
  });

  it('handles LF line breaks correctly', () => {
    const source = 'line 1\nline 2\nline 3';
    const locator = createSourceLocator(source);

    // End of line 1 (before '\n')
    expect(locator.positionAt(6)).toEqual({ line: 1, column: 7, offset: 6 });
    // The '\n' character itself
    expect(locator.positionAt(6)).toEqual({ line: 1, column: 7, offset: 6 });
    // Start of line 2 (offset 7)
    expect(locator.positionAt(7)).toEqual({ line: 2, column: 1, offset: 7 });
    // End of line 2 (offset 13)
    expect(locator.positionAt(13)).toEqual({ line: 2, column: 7, offset: 13 });
    // Start of line 3 (offset 14)
    expect(locator.positionAt(14)).toEqual({ line: 3, column: 1, offset: 14 });
  });

  it('handles CRLF line breaks counting as one line break while retaining both offset bytes/units', () => {
    const source = 'line 1\r\nline 2\r\nline 3';
    const locator = createSourceLocator(source);

    // 'line 1' is 6 chars (offsets 0..5)
    expect(locator.positionAt(5)).toEqual({ line: 1, column: 6, offset: 5 });
    // '\r' is offset 6 (line 1, column 7)
    expect(locator.positionAt(6)).toEqual({ line: 1, column: 7, offset: 6 });
    // '\n' is offset 7 (line 1, column 8)
    expect(locator.positionAt(7)).toEqual({ line: 1, column: 8, offset: 7 });
    // 'l' of 'line 2' is offset 8 (line 2, column 1)
    expect(locator.positionAt(8)).toEqual({ line: 2, column: 1, offset: 8 });
    // '2' of 'line 2' is offset 13 (line 2, column 6)
    expect(locator.positionAt(13)).toEqual({ line: 2, column: 6, offset: 13 });
    // Start of line 3 is offset 16 (line 3, column 1)
    expect(locator.positionAt(16)).toEqual({ line: 3, column: 1, offset: 16 });
  });

  it('accurately locates Vietnamese characters and UTF-16 surrogate pairs (emoji)', () => {
    // 'Tiếng Việt 😀 xin chào'
    // 'Tiếng Việt ' has length 11 (0..10)
    // '😀' is a surrogate pair: length 2 (offsets 11 and 12)
    // ' xin chào' starts at offset 13
    const source = 'Tiếng Việt 😀 xin chào';
    const locator = createSourceLocator(source);

    expect(locator.positionAt(0)).toEqual({ line: 1, column: 1, offset: 0 });
    // Offset 11 is start of emoji
    expect(locator.positionAt(11)).toEqual({ line: 1, column: 12, offset: 11 });
    // Offset 13 is after emoji (space before 'xin')
    expect(locator.positionAt(13)).toEqual({ line: 1, column: 14, offset: 13 });
  });

  it('creates half-open SourceRange [start, end) and verifies range boundary invariants', () => {
    const source = 'Hello\nWorld';
    const locator = createSourceLocator(source);

    const r = locator.range(0, 5);
    expect(r.start).toEqual({ line: 1, column: 1, offset: 0 });
    expect(r.end).toEqual({ line: 1, column: 6, offset: 5 });
    expect(source.slice(r.start.offset, r.end.offset)).toBe('Hello');

    // Reject start > end
    expect(() => locator.range(5, 2)).toThrow(/start offset.*greater than end offset/i);
    // Reject out of bounds
    expect(() => locator.range(0, 20)).toThrow(/out of bounds/i);
  });
});
