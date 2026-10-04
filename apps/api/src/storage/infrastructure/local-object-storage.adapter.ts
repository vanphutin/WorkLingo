import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  PutObjectInput,
  StoredObject,
} from '../domain/object-storage.port';
import {
  ObjectStorage,
  UnsafeStorageKeyError,
} from '../domain/object-storage.port';

export class LocalObjectStorageAdapter extends ObjectStorage {
  constructor(private readonly root: string) {
    super();
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveKey(key));
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    const key = `${input.prefix}/${randomUUID()}`;
    const target = this.resolveKey(key);
    const temporaryTarget = `${target}.${randomUUID()}.tmp`;

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(temporaryTarget, input.body, { flag: 'wx' });

    try {
      await rename(temporaryTarget, target);
    } catch (error) {
      await unlink(temporaryTarget).catch(() => undefined);
      throw error;
    }

    return {
      contentType: input.contentType,
      key,
      size: input.body.byteLength,
    };
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  private resolveKey(key: string): string {
    if (
      key.length === 0 ||
      path.isAbsolute(key) ||
      path.win32.isAbsolute(key)
    ) {
      throw new UnsafeStorageKeyError(key);
    }

    const root = path.resolve(this.root);
    const target = path.resolve(root, key);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      throw new UnsafeStorageKeyError(key);
    }

    return target;
  }
}
