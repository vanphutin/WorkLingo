import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { beginnerProgramImportPermissionSchema, type BeginnerPermission } from '@worklingo/contracts';
import type { Prisma } from '@prisma/client';

export type ProgramImportPermission = Extract<BeginnerPermission, { schemaVersion: 3 }>;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical((value as Record<string, unknown>)[key])]));
  return value;
}
export function programImportHash(value: unknown): string {
  // ASCII property names have the same order as the existing Beginner hash contract.
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
export function validateProgramImportPermission(input: unknown, now = Date.now()): ProgramImportPermission {
  const permission = beginnerProgramImportPermissionSchema.parse(input);
  const { recordHash, ...record } = permission;
  const issued = Date.parse(record.issuedAt), expiry = Date.parse(record.expiresAt);
  if (programImportHash(record) !== recordHash || issued > now + 5000 || expiry <= now || expiry <= issued || expiry - issued > 4 * 60 * 60 * 1000) throw new Error('BEGINNER_IMPORT_PERMISSION_INVALID');
  return permission;
}
/** Operator CLI only; no HTTP route can supply this authority. File bytes are independently pinned. */
export function readProgramImportPermission(): ProgramImportPermission | null {
  const file = process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_FILE;
  if (!file) return null;
  const stat = lstatSync(file);
  const bytes = readFileSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || createHash('sha256').update(bytes).digest('hex') !== process.env.WORKLINGO_BEGINNER_IMPORT_PERMISSION_SHA256) throw new Error('BEGINNER_IMPORT_PERMISSION_INVALID');
  return validateProgramImportPermission(JSON.parse(bytes.toString('utf8')));
}
export async function verifyProgramImportTarget(tx: Prisma.TransactionClient, permission: ProgramImportPermission): Promise<void> {
  validateProgramImportPermission(permission);
  const target = new URL(process.env.DATABASE_URL ?? '');
  const expected = permission.database;
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || target.hostname !== expected.host || Number(target.port || 5432) !== expected.port || decodeURIComponent(target.username) !== expected.role || decodeURIComponent(target.pathname.slice(1)) !== expected.name || target.hash || [...target.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')) throw new Error('BEGINNER_ENVIRONMENT_MISMATCH');
  const [actual] = await tx.$queryRaw<{ database: string; role: string; serverIdentity: string }[]>`SELECT current_database() AS database,current_user AS role,(SELECT system_identifier::text FROM pg_control_system()) AS "serverIdentity"`;
  if (!actual || actual.database !== expected.name || actual.role !== expected.role || actual.serverIdentity !== expected.serverIdentity) throw new Error('BEGINNER_DATABASE_IDENTITY_MISMATCH');
  if (process.env.WORKLINGO_DATA_DIR !== permission.storageRoot) throw new Error('BEGINNER_STORAGE_MISMATCH');
}
