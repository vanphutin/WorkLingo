import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BeginnerImportAudioStorage } from './beginner-import-audio-storage.js';

describe('recoverable exact offline audio admission', () => {
  it('reuses exact objects after a later database failure and recovers an interrupted staging file', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'r21-audio-storage-'));
    const body = Buffer.from('reviewed synthetic WAV bytes');
    const digest = createHash('sha256').update(body).digest('hex');
    const prefix = 'beginner-r21-reviewed-audio';
    await mkdir(path.join(root, prefix));
    await writeFile(path.join(root, prefix, digest + '.pending'), 'interrupted partial bytes');
    const storage = new BeginnerImportAudioStorage(root);
    const first = await storage.put({ body, contentType: 'audio/wav', prefix });
    // The database may roll back after put; a subsequent apply must reuse the same object.
    const retry = await storage.put({ body, contentType: 'audio/wav', prefix });
    expect(retry.key).toBe(first.key);
    expect(await readFile(path.join(root, retry.key))).toEqual(body);
    expect(await readdir(path.join(root, prefix))).toEqual([digest]);
  });
  it('rejects a corrupted existing object instead of silently accepting or overwriting it', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'r21-audio-storage-'));
    const storage = new BeginnerImportAudioStorage(root);
    const input = { body: Buffer.from('exact bytes'), contentType: 'audio/wav', prefix: 'beginner-r21-reviewed-audio' };
    const stored = await storage.put(input);
    await writeFile(path.join(root, stored.key), 'corruption');
    await expect(storage.put(input)).rejects.toThrow('BEGINNER_STORED_AUDIO_CHANGED');
  });
});
