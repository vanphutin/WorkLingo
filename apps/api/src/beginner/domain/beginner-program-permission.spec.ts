import { describe, expect, it } from 'vitest';
import { validateProgramImportPermission } from './beginner-program-permission.js';
import { hashBeginnerRecord } from './beginner-environment-preflight.js';
const record = () => ({ schemaVersion: 3, mode: 'PROGRAM_IMPORT', approvalId: 'r21-20261107', environmentId: 'r21-primary', runId: 'abcdef123456', programId: '10000000-0000-4000-8000-000000000001', database: { host: '127.0.0.1', port: 55432, name: 'worklingo', role: 'worklingo', serverIdentity: '123456' }, storageRoot: 'D:/data', registryRoot: 'D:/registry', approvalRoot: 'D:/approval', ownedTempRoot: 'D:/temp', actions: ['read','author','validate','review','publish'], issuedAt: '2030-01-01T00:00:00.000Z', expiresAt: '2030-01-01T04:00:00.000Z', revoked: false, approvedBy: 'WorkLingo product owner', authorizationSource: 'docs/superpowers/specs/2026-11-07-r21-beginner-publication-design.md', sourceInventoryHash: 'a'.repeat(64), backupHash: 'b'.repeat(64), dryRunHash: 'c'.repeat(64) });
const seal = (value: object) => ({ ...value, recordHash: hashBeginnerRecord(value) });
describe('bounded R2.1 import permission', () => {
  it('accepts explicit fresh bounded authority without adopting historical fixture approval', () => {
    expect(validateProgramImportPermission(seal(record()), Date.parse('2030-01-01T01:00:00Z')).mode).toBe('PROGRAM_IMPORT');
  });
  it('rejects changed write sets, expired authority and destructive capability', () => {
    expect(() => validateProgramImportPermission({ ...seal(record()), dryRunHash: 'd'.repeat(64) }, Date.parse('2030-01-01T01:00:00Z'))).toThrow();
    expect(() => validateProgramImportPermission(seal(record()), Date.parse('2030-01-01T05:00:00Z'))).toThrow();
    expect(() => validateProgramImportPermission(seal({ ...record(), actions: ['cleanup'] }), Date.parse('2030-01-01T01:00:00Z'))).toThrow();
  });
});
