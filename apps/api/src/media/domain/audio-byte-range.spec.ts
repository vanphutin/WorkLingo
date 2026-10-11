import { describe, expect, it } from 'vitest';

import { parseSingleByteRange } from './audio-byte-range.js';

describe('parseSingleByteRange', () => {
  it('uses the complete representation when Range is absent', () => {
    expect(parseSingleByteRange(undefined, 100)).toEqual({ kind: 'full' });
  });

  it.each([
    ['bytes=0-9', { end: 9, kind: 'partial', start: 0 }],
    ['bytes=10-', { end: 99, kind: 'partial', start: 10 }],
    ['bytes=-10', { end: 99, kind: 'partial', start: 90 }],
    ['bytes=90-200', { end: 99, kind: 'partial', start: 90 }],
    ['bytes=-200', { end: 99, kind: 'partial', start: 0 }],
  ])('parses and normalizes %s', (header, expected) => {
    expect(parseSingleByteRange(header, 100)).toEqual(expected);
  });

  it.each([
    'items=0-9',
    'bytes=0-9,20-29',
    'bytes=',
    'bytes=-0',
    'bytes=abc-def',
    'bytes=10-9',
    'bytes=100-',
  ])('rejects malformed or unsatisfiable range %s', (header) => {
    expect(parseSingleByteRange(header, 100)).toEqual({ kind: 'unsatisfiable' });
  });

  it('rejects every requested range for an empty representation', () => {
    expect(parseSingleByteRange('bytes=0-', 0)).toEqual({ kind: 'unsatisfiable' });
  });
});
