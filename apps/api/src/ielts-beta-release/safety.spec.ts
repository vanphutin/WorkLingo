import { describe, expect, it } from 'vitest';
import { assertLocalDatabase, parseOptions, runRelease, verifyWave } from './safety.js';

describe('local IELTS release safety', () => {
  it('defaults to read-only and rejects unknown flags', () => {
    expect(parseOptions([]).execute).toBe(false);
    expect(parseOptions(['--execute']).execute).toBe(true);
    expect(() => parseOptions(['--force'])).toThrow();
  });
  it('accepts a reviewed fingerprint and rejects malformed or duplicated expectations', () => {
    expect(parseOptions(['--execute', '--expect=' + 'a'.repeat(64)]).expect).toBe('a'.repeat(64));
    expect(() => parseOptions(['--expect=secret'])).toThrow();
    expect(() => parseOptions(['--execute', '--execute'])).toThrow();
  });
  it.each(['db.example.org', '127.0.0.1.example.org', '0.0.0.0'])('rejects non-loopback DB %s without echoing credentials', (host) => {
    expect(() => assertLocalDatabase(`postgresql://private:secret@${host}:55432/worklingo?schema=public`)).toThrow('local database');
  });
  it('accepts only the intended local public database endpoint', () => {
    expect(() => assertLocalDatabase('postgresql://private:secret@127.0.0.1:55432/worklingo?schema=public')).not.toThrow();
    expect(() => assertLocalDatabase('postgresql://private:secret@127.0.0.1:55433/worklingo')).toThrow();
    expect(() => assertLocalDatabase('postgresql://private:secret@127.0.0.1:55432/worklingo?schema=test')).toThrow();
  });
  it('dry run does not snapshot or mutate', async () => {
    const events: string[] = [];
    const result = await runRelease(false, {
      inspect: async () => ({ fingerprint: 'a', complete: false }),
      snapshot: async () => { events.push('snapshot'); },
      execute: async () => { events.push('write'); },
    });
    expect(result).toBe('DRY_RUN');
    expect(events).toEqual([]);
  });
  it('requires a completed private snapshot before entering the write transaction', async () => {
    const events: string[] = [];
    await expect(runRelease(true, {
      inspect: async () => ({ fingerprint: 'a', complete: false }),
      snapshot: async () => { throw new Error('private snapshot failed'); },
      execute: async () => { events.push('write'); },
    })).rejects.toThrow('private snapshot failed');
    expect(events).toEqual([]);
  });
  it('passes the inspected fingerprint to the transaction and skips an unchanged rerun', async () => {
    const events: string[] = [];
    expect(await runRelease(true, {
      inspect: async () => ({ fingerprint: 'reviewed', complete: false }),
      snapshot: async () => { events.push('snapshot'); },
      execute: async (fingerprint) => { events.push(fingerprint); },
    })).toBe('RELEASED');
    expect(events).toEqual(['snapshot', 'reviewed']);
    expect(await runRelease(true, {
      inspect: async () => ({ fingerprint: 'new', complete: true }),
      snapshot: async () => { throw new Error('must skip'); },
      execute: async () => { throw new Error('must skip'); },
    })).toBe('ALREADY_RELEASED');
  });
  it('rejects header-only fake WAVs and silence', () => {
    expect(() => verifyWave(Buffer.from('RIFF fake audio'))).toThrow();
    const wave = Buffer.alloc(44 + 48000 * 2);
    wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8);
    wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
    wave.writeUInt32LE(24000, 24); wave.writeUInt32LE(48000, 28);
    wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40);
    expect(() => verifyWave(wave)).toThrow('silent');
  });
});
