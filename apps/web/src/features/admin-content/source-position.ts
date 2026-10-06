export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

/**
 * Computes the 0-based UTF-16 character offset for a 1-based line/column position.
 * Correctly accounts for LF and CRLF line breaks and unicode/emoji.
 */
export function offsetForPosition(source: string, position: SourcePosition): number {
  if (position.line <= 1) {
    const colOffset = Math.max(0, position.column - 1);
    return Math.min(source.length, colOffset);
  }

  let currentLine = 1;
  let offset = 0;
  const len = source.length;

  while (offset < len && currentLine < position.line) {
    const char = source.charCodeAt(offset);
    if (char === 10) {
      // \n
      currentLine++;
      offset++;
    } else if (char === 13) {
      // \r
      currentLine++;
      offset++;
      if (offset < len && source.charCodeAt(offset) === 10) {
        // \r\n
        offset++;
      }
    } else {
      offset++;
    }
  }

  // If target line was reached, add column offset (1-based -> column - 1)
  if (currentLine === position.line) {
    const targetOffset = offset + Math.max(0, position.column - 1);
    return Math.min(len, targetOffset);
  }

  // Clamped to end of string if line exceeded EOF
  return len;
}

/**
 * Computes the 1-based line/column position for a 0-based character offset.
 */
export function positionForOffset(source: string, targetOffset: number): SourcePosition {
  const clampedOffset = Math.max(0, Math.min(source.length, targetOffset));
  let line = 1;
  let lastLineStart = 0;
  let i = 0;

  while (i < clampedOffset) {
    const char = source.charCodeAt(i);
    if (char === 10) {
      line++;
      i++;
      lastLineStart = i;
    } else if (char === 13) {
      line++;
      i++;
      if (i < source.length && source.charCodeAt(i) === 10) {
        i++;
      }
      lastLineStart = i;
    } else {
      i++;
    }
  }

  const column = clampedOffset - lastLineStart + 1;
  return { line, column };
}
