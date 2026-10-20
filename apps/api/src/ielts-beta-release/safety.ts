export function parseOptions(args: string[]): { execute: boolean; expect?: string } {
  if (args.some((arg) => arg !== '--execute' && !/^--expect=[a-f0-9]{64}$/u.test(arg))
    || args.filter((arg) => arg === '--execute').length > 1 || args.filter((arg) => arg.startsWith('--expect=')).length > 1) throw new Error('Use --execute and an optional --expect=<64 hex fingerprint>.');
  const expected = args.find((arg) => arg.startsWith('--expect='))?.slice(9);
  return { execute: args.includes('--execute'), ...(expected ? { expect: expected } : {}) };
}
export function assertLocalDatabase(value: string): void {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || url.port !== '55432' || url.pathname !== '/worklingo'
      || [...url.searchParams.keys()].some((key) => key !== 'schema')
      || (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) throw new Error();
  } catch { throw new Error('Expected the local database on loopback:55432/worklingo, schema public.'); }
}
export interface ReleasePort {
  inspect(): Promise<{ fingerprint: string; complete: boolean }>;
  snapshot(): Promise<void>;
  execute(fingerprint: string): Promise<void>;
}
export async function runRelease(execute: boolean, port: ReleasePort): Promise<string> {
  const inspection = await port.inspect();
  if (!execute) return 'DRY_RUN';
  if (inspection.complete) return 'ALREADY_RELEASED';
  await port.snapshot();
  await port.execute(inspection.fingerprint);
  return 'RELEASED';
}

/** Parse RIFF chunks: System.Speech may emit additional chunks before PCM data. */
export function verifyWave(bytes: Buffer): { durationSeconds: number } {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE'
    || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('Invalid WAV container.');
  let sampleRate = 0; let byteRate = 0; let pcm: Buffer | undefined;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4); const length = bytes.readUInt32LE(offset + 4); const start = offset + 8;
    if (start + length > bytes.length) throw new Error('Truncated WAV chunk.');
    if (kind === 'fmt ') {
      if (length < 16 || bytes.readUInt16LE(start) !== 1 || bytes.readUInt16LE(start + 2) !== 1 || bytes.readUInt16LE(start + 14) !== 16) throw new Error('Expected mono 16-bit PCM WAV.');
      sampleRate = bytes.readUInt32LE(start + 4); byteRate = bytes.readUInt32LE(start + 8);
      if (sampleRate < 16000 || byteRate !== sampleRate * 2 || bytes.readUInt16LE(start + 12) !== 2) throw new Error('Invalid WAV sample format.');
    }
    if (kind === 'data') pcm = bytes.subarray(start, start + length);
    offset = start + length + (length % 2);
  }
  if (!pcm || !byteRate || pcm.length % 2 || pcm.length / byteRate < 1) throw new Error('Missing or insufficient WAV speech.');
  let active = 0;
  for (let offset = 0; offset < pcm.length; offset += 2) if (Math.abs(pcm.readInt16LE(offset)) > 100) active++;
  if (active / (pcm.length / 2) < 0.01) throw new Error('WAV is silent.');
  return { durationSeconds: pcm.length / byteRate };
}
