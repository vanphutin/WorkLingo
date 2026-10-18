import { describe, expect, it } from 'vitest';
import { publishAtomically } from './transaction.js';

describe('atomic release transaction', () => {
  const database = () => {
    const committed = { publications: 0, beta: false };
    return { committed, async transaction<T>(work: (draft: typeof committed) => Promise<T>) {
      const draft = structuredClone(committed);
      const result = await work(draft); Object.assign(committed, draft); return result;
    } };
  };
  it('rejects a changed revision/fingerprint before publishing', async () => {
    const db = database();
    await expect(publishAtomically<{ publications: number; beta: boolean }>(db.transaction, 'reviewed', {
      lockAndFingerprint: async () => 'changed', publish: async (tx) => { tx.publications++; },
      readiness: async () => true, enableBeta: async (tx) => { tx.beta = true; },
    })).rejects.toThrow('changed');
    expect(db.committed).toEqual({ publications: 0, beta: false });
  });
  it('rolls back publication and never enables Beta when readiness or media checks fail', async () => {
    const db = database();
    await expect(publishAtomically<{ publications: number; beta: boolean }>(db.transaction, 'same', {
      lockAndFingerprint: async () => 'same', publish: async (tx) => { tx.publications++; },
      readiness: async () => false, enableBeta: async (tx) => { tx.beta = true; },
    })).rejects.toThrow('readiness');
    expect(db.committed).toEqual({ publications: 0, beta: false });
  });
  it('sets Beta only after new publications pass readiness in the same transaction', async () => {
    const db = database();
    await publishAtomically<{ publications: number; beta: boolean }>(db.transaction, 'same', {
      lockAndFingerprint: async () => 'same', publish: async (tx) => { tx.publications = 7; },
      readiness: async (tx) => tx.publications === 7 && !tx.beta,
      enableBeta: async (tx) => { tx.beta = true; },
    });
    expect(db.committed).toEqual({ publications: 7, beta: true });
  });
  it('does not commit partial publications if an existing publisher fails', async () => {
    const db = database();
    await expect(publishAtomically<{ publications: number; beta: boolean }>(db.transaction, 'same', {
      lockAndFingerprint: async () => 'same', publish: async (tx) => { tx.publications++; throw new Error('publisher conflict'); },
      readiness: async () => true, enableBeta: async (tx) => { tx.beta = true; },
    })).rejects.toThrow('publisher conflict');
    expect(db.committed).toEqual({ publications: 0, beta: false });
  });
});
