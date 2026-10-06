export type SourcePosition = {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
};

export type SourceRange = {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
};

export interface SourceLocator {
  positionAt(offset: number): SourcePosition;
  range(startOffset: number, endOffset: number): SourceRange;
}

export function createSourceLocator(source: string): SourceLocator {
  const lineStarts: number[] = [0];
  const len = source.length;

  for (let i = 0; i < len; i++) {
    const ch = source.charCodeAt(i);
    if (ch === 13 /* \r */) {
      if (i + 1 < len && source.charCodeAt(i + 1) === 10 /* \n */) {
        lineStarts.push(i + 2);
        i++;
      } else {
        lineStarts.push(i + 1);
      }
    } else if (ch === 10 /* \n */) {
      lineStarts.push(i + 1);
    }
  }

  function positionAt(offset: number): SourcePosition {
    if (offset < 0 || offset > len) {
      throw new Error(`Offset ${offset} is out of bounds (0..${len})`);
    }

    let low = 0;
    let high = lineStarts.length - 1;
    let lineIdx = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lineStarts[mid]! <= offset) {
        lineIdx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const line = lineIdx + 1;
    const lineStart = lineStarts[lineIdx]!;
    const column = offset - lineStart + 1;

    return { line, column, offset };
  }

  function range(startOffset: number, endOffset: number): SourceRange {
    if (startOffset < 0 || startOffset > len) {
      throw new Error(`Start offset ${startOffset} is out of bounds (0..${len})`);
    }
    if (endOffset < 0 || endOffset > len) {
      throw new Error(`End offset ${endOffset} is out of bounds (0..${len})`);
    }
    if (startOffset > endOffset) {
      throw new Error(`Start offset ${startOffset} is greater than end offset ${endOffset}`);
    }

    return {
      start: positionAt(startOffset),
      end: positionAt(endOffset),
    };
  }

  return { positionAt, range };
}
