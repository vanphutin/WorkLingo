import { LocalObjectStorageAdapter } from '../../storage/infrastructure/local-object-storage.adapter.js';
import type { PutObjectInput, StoredObject } from '../../storage/domain/object-storage.port.js';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Offline import only. Content identities survive a DB rollback and are reused on retry.
 * The caller holds the import advisory lock; a partial staging file is recoverable. */
export class BeginnerImportAudioStorage extends LocalObjectStorageAdapter {
  constructor(private readonly importRoot: string) { super(importRoot); }
  override async put(input: PutObjectInput): Promise<StoredObject> {
    if (input.prefix !== 'beginner-r21-reviewed-audio' || input.contentType !== 'audio/wav') throw new Error('BEGINNER_OFFLINE_AUDIO_ONLY');
    const digest = createHash('sha256').update(input.body).digest('hex');
    const key = `${input.prefix}/${digest}`;
    const target = path.join(this.importRoot, key), pending = target + '.pending';
    const stat = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (stat) {
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || createHash('sha256').update(await readFile(target)).digest('hex') !== digest) throw new Error('BEGINNER_STORED_AUDIO_CHANGED');
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      const staged = await lstat(pending).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (staged) {
        if (!staged.isFile() || staged.isSymbolicLink() || staged.nlink !== 1) throw new Error('BEGINNER_UNSAFE_AUDIO_STAGING');
        await unlink(pending);
      }
      await writeFile(pending, input.body, { flag: 'wx' });
      await rename(pending, target);
    }
    return { key, contentType: input.contentType, size: input.body.length };
  }
}
