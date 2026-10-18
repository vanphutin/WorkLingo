import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, listening } from './content.js';
import { verifyWave } from './safety.js';

export const releaseDirectory = __dirname;
export const preparedDirectory = path.join(releaseDirectory, '.prepared');
export const bytesHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export interface PreparedAudio {
  part: number; inputHash: string; checksum: string; durationSeconds: number; byteSize: number;
  adapterName: 'local-windows-speech'; voices: string[];
}

/** This command writes local files only. It never imports Prisma or invokes a provider. */
async function prepare() {
  await mkdir(preparedDirectory, { recursive: true });
  const manifest: PreparedAudio[] = [];
  for (const [index, script] of listening.entries()) {
    const part = index + 1;
    const inputPath = path.join(preparedDirectory, `part-${part}.json`);
    const wavePath = path.join(preparedDirectory, `part-${part}.wav`);
    await writeFile(inputPath, JSON.stringify(script.turns), 'utf8');
    execFileSync('pwsh.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(releaseDirectory, 'generate-speech.ps1'), '-InputJson', inputPath, '-OutputWave', wavePath], { stdio: 'pipe', timeout: 120_000 });
    const bytes = await readFile(wavePath); const wave = verifyWave(bytes);
    manifest.push({ part, inputHash: hash(script.turns), checksum: bytesHash(bytes), durationSeconds: wave.durationSeconds,
      byteSize: bytes.length, adapterName: 'local-windows-speech', voices: [...new Set(script.turns.map((turn) => turn.voice))] });
    console.log(`Prepared original Listening part ${part}: ${wave.durationSeconds.toFixed(1)} seconds.`);
  }
  await writeFile(path.join(preparedDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

export async function readPreparedAudio(): Promise<{ manifest: PreparedAudio[]; waves: Buffer[] }> {
  const manifest = JSON.parse(await readFile(path.join(preparedDirectory, 'manifest.json'), 'utf8')) as PreparedAudio[];
  if (!Array.isArray(manifest) || manifest.length !== 4) throw new Error('Prepare four real Listening recordings first.');
  const waves: Buffer[] = [];
  for (const [index, entry] of manifest.entries()) {
    const script = listening[index]!;
    const bytes = await readFile(path.join(preparedDirectory, `part-${index + 1}.wav`));
    const wave = verifyWave(bytes);
    if (entry.part !== index + 1 || entry.inputHash !== hash(script.turns) || entry.adapterName !== 'local-windows-speech'
      || entry.checksum !== bytesHash(bytes) || entry.byteSize !== bytes.length || Math.abs(wave.durationSeconds - entry.durationSeconds) > 0.01
      || wave.durationSeconds < 60 || hash(entry.voices) !== hash([...new Set(script.turns.map((turn) => turn.voice))])) throw new Error('Prepared audio/provenance mismatch. Regenerate locally.');
    waves.push(bytes);
  }
  if (new Set(manifest.map((entry) => entry.checksum)).size !== 4) throw new Error('Listening recordings must be distinct.');
  return { manifest, waves };
}

if (require.main === module) {
  prepare().catch(() => { console.error('Offline audio preparation failed. Check installed Microsoft David, Mark and Zira voices.'); process.exitCode = 1; });
}
