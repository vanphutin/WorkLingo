import { existsSync, lstatSync, writeFileSync, renameSync, linkSync, rmSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { requireCondition } from './model.mjs';

export function safeFile(path) {
  if (existsSync(path)) requireCondition(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), `Unsafe symlink/file path: ${path}`);
}
export function contentHash(text) { return createHash('sha256').update(text).digest('hex'); }
function publish(path, text, exclusive) {
  safeFile(path);
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, text, { flag: 'wx' });
    const fd = openSync(temp, 'r+');
    try { fsyncSync(fd); } finally { closeSync(fd); }
    // Linking stages a complete file without ever overwriting an existing ID.
    if (exclusive) linkSync(temp, path);
    else renameSync(temp, path);
  } finally { if (existsSync(temp)) rmSync(temp); }
}
export function atomicWrite(path, text) { publish(path, text, false); }
export function atomicCreate(path, text) { publish(path, text, true); }
