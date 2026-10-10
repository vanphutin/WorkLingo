export type AudioByteRange =
  | { kind: 'full' }
  | { end: number; kind: 'partial'; start: number }
  | { kind: 'unsatisfiable' };

const BYTE_RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/;

export function parseSingleByteRange(
  header: string | undefined,
  size: number,
): AudioByteRange {
  if (header === undefined) return { kind: 'full' };
  if (!Number.isSafeInteger(size) || size <= 0 || header.includes(',')) {
    return { kind: 'unsatisfiable' };
  }

  const match = BYTE_RANGE_PATTERN.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    return { kind: 'unsatisfiable' };
  }

  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: 'unsatisfiable' };
    }

    return {
      end: size - 1,
      kind: 'partial',
      start: Math.max(0, size - suffixLength),
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] === '' ? size - 1 : Number(match[2]);
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(requestedEnd)
    || start >= size
    || requestedEnd < start
  ) {
    return { kind: 'unsatisfiable' };
  }

  return {
    end: Math.min(requestedEnd, size - 1),
    kind: 'partial',
    start,
  };
}
