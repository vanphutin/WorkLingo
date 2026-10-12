import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('pilot recovery qualification contract', () => {
  it('keeps backup and restore path containment, checksums and empty-target guards', () => {
    const scriptsRoot = path.resolve(process.cwd(), '../../scripts');
    const backup = readFileSync(path.join(scriptsRoot, 'backup-local.ps1'), 'utf8');
    const restore = readFileSync(path.join(scriptsRoot, 'restore-local.ps1'), 'utf8');
    expect(backup).toContain('Test-PathWithinRoot');
    expect(backup).toContain('Get-Sha256Hex');
    expect(restore).toContain('Checksum verification');
    expect(restore).toContain('Restore requires an empty target');
    expect(restore).not.toContain('reset --hard');
  });
});
