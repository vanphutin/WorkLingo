import { createHash } from 'node:crypto';

export function documentContextSignature(type: string, text: string): string {
  return createHash('sha256').update(`${type}:${text.trim().replace(/\s+/gu, ' ')}`).digest('hex');
}
