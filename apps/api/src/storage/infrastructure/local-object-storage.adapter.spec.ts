import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { UnsafeStorageKeyError } from '../domain/object-storage.port';
import { LocalObjectStorageAdapter } from './local-object-storage.adapter';

const temporaryRoots: string[] = [];

async function makeStorage(): Promise<{
  root: string;
  storage: LocalObjectStorageAdapter;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'worklingo-storage-'));
  temporaryRoots.push(root);
  return { root, storage: new LocalObjectStorageAdapter(root) };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { force: true, recursive: true }),
    ),
  );
});

describe('LocalObjectStorageAdapter', () => {
  it('writes, reads, and deletes an object within the configured root', async () => {
    const { root, storage } = await makeStorage();
    const body = Buffer.from('audio fixture');

    const stored = await storage.put({
      body,
      contentType: 'audio/webm',
      prefix: 'recordings',
    });

    expect(stored.key).toMatch(/^recordings\/[0-9a-f-]+$/u);
    expect(stored.size).toBe(body.byteLength);
    await expect(readFile(path.join(root, stored.key))).resolves.toEqual(body);
    await expect(storage.read(stored.key)).resolves.toEqual(body);

    await storage.delete(stored.key);

    await expect(storage.read(stored.key)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it.each(['../outside', 'recordings/../../outside', 'C:\\outside']) (
    'rejects unsafe storage key %s',
    async (key) => {
      const { storage } = await makeStorage();

      await expect(storage.read(key)).rejects.toBeInstanceOf(
        UnsafeStorageKeyError,
      );
    },
  );
});
