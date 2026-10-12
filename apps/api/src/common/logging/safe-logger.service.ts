import { Injectable, type LoggerService } from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'access_token',
  'apikey',
  'api-key',
  'authorization',
  'cookie',
  'credential',
  'credentials',
  'hashkey',
  'keyhash',
  'password',
  'private_key',
  'privatekey',
  'rawresponse',
  'refresh_token',
  'refreshtoken',
  'response',
  'secret',
  'set-cookie',
  'token',
  'transcript',
]);

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/giu;
const CONNECTION_STRING_PATTERN = /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+/giu;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b/gu;
const DATABASE_AUTH_PATTERN = /password authentication failed for user\s+[^\s]+/giu;

const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 1024;
const MAX_KEYS = 100;

export function redactValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let sanitized = value
      .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
      .replace(CONNECTION_STRING_PATTERN, '[REDACTED_CONNECTION]')
      .replace(DATABASE_AUTH_PATTERN, 'database authentication failed for [REDACTED_USER]')
      .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
      .replace(IPV4_PATTERN, '[REDACTED_IP]');

    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = `${sanitized.slice(0, MAX_STRING_LENGTH)}... [TRUNCATED ${sanitized.length} chars]`;
    }
    return sanitized;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  if (depth >= MAX_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_KEYS)
      .map((item) => redactValue(item, seen, depth + 1));
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, MAX_KEYS);

  for (const [key, val] of entries) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactValue(val, seen, depth + 1);
    }
  }

  return result;
}

@Injectable()
export class SafeLoggerService implements LoggerService {
  log(message: string, context?: unknown): void {
    this.writeEntry('INFO', message, context);
  }

  warn(message: string, context?: unknown): void {
    this.writeEntry('WARN', message, context);
  }

  error(message: string, trace?: string, context?: unknown): void {
    this.writeEntry('ERROR', message, context, trace);
  }

  debug?(message: string, context?: unknown): void {
    this.writeEntry('DEBUG', message, context);
  }

  private writeEntry(
    level: string,
    message: string,
    context?: unknown,
    trace?: string,
  ): void {
    const entry = {
      context: context !== undefined ? redactValue(context) : undefined,
      level,
      message: typeof message === 'string' ? redactValue(message) : message,
      timestamp: new Date().toISOString(),
      trace: trace ? String(redactValue(trace)) : undefined,
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
