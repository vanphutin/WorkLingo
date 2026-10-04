export interface PutObjectInput {
  readonly body: Buffer;
  readonly contentType: string;
  readonly prefix: string;
}

export interface StoredObject {
  readonly contentType: string;
  readonly key: string;
  readonly size: number;
}

export class UnsafeStorageKeyError extends Error {
  constructor(key: string) {
    super(`Unsafe storage key: ${key}`);
    this.name = 'UnsafeStorageKeyError';
  }
}

export abstract class ObjectStorage {
  abstract delete(key: string): Promise<void>;
  abstract put(input: PutObjectInput): Promise<StoredObject>;
  abstract read(key: string): Promise<Buffer>;
}
