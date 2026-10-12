const FORBIDDEN_KEY_PATTERNS = [
  /password/iu,
  /hash/iu,
  /token/iu,
  /cookie/iu,
  /secret/iu,
  /credential/iu,
  /auth/iu,
  /api[-_]?key/iu,
  /source[-_]?text/iu,
  /raw[-_]?source/iu,
  /learner[-_]?response/iu,
  /transcript/iu,
  /writing/iu,
  /recording/iu,
  /audio/iu,
  /bytes/iu,
  /provider[-_]?payload/iu,
  /provider[-_]?error/iu,
  /email/iu,
];

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 4;
const MAX_KEYS = 50;

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(
  value: unknown,
  depth: number,
  visited: Set<object>,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? value.slice(0, MAX_STRING_LENGTH)
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'object') {
    return null;
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return undefined;
  }

  if (visited.has(value)) {
    return undefined;
  }

  if (depth > MAX_DEPTH) {
    return undefined;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .slice(0, MAX_KEYS)
      .map((item) => sanitizeValue(item, depth + 1, visited))
      .filter((item) => item !== undefined);
    return sanitizedArray;
  }

  const result: Record<string, unknown> = {};
  let keyCount = 0;

  for (const [key, propValue] of Object.entries(value)) {
    if (keyCount >= MAX_KEYS) break;

    if (isForbiddenKey(key)) {
      continue;
    }

    const sanitizedChild = sanitizeValue(propValue, depth + 1, visited);
    if (sanitizedChild !== undefined) {
      result[key] = sanitizedChild;
      keyCount++;
    }
  }

  return result;
}

export function sanitizeAuditState(
  input: unknown,
): Record<string, unknown> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const visited = new Set<object>();
  const sanitized = sanitizeValue(input, 1, visited);

  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return null;
  }

  return sanitized as Record<string, unknown>;
}
