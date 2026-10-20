import { execFileSync } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { releaseDirectory } from './prepare-audio.js';

/** Permission failure aborts before any content/storage mutation. No secrets or learner records are passed here. */
export async function savePrivateSnapshot(value: unknown): Promise<string> {
  const directory = path.join(releaseDirectory, '.private');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const identity = execFileSync('whoami.exe', [], { encoding: 'utf8', windowsHide: true }).trim();
    execFileSync('icacls.exe', [directory, '/inheritance:r', '/grant:r', `${identity}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { stdio: 'pipe', windowsHide: true });
  }
  const file = path.join(directory, `before-${new Date().toISOString().replaceAll(':', '-')}.json`);
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2)); await handle.sync(); } finally { await handle.close(); }
  return file;
}
