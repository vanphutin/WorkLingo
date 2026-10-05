import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

function runPowerShellScript(
  scriptRelativePath: string,
  args: Record<string, string>,
): { status: number | null; stdout: string; stderr: string } {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const scriptPath = path.resolve(repoRoot, scriptRelativePath);

  const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath];
  for (const [key, val] of Object.entries(args)) {
    psArgs.push(`-${key}`, val);
  }

  const result = spawnSync('powershell.exe', psArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env },
    timeout: 60_000,
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('backup and restore rehearsal', () => {
  let tempRoot: string;
  let sourceDataDir: string;
  let backupDir: string;
  let sourceDbUrl: string;
  let targetDbUrl: string;
  let sourceSchema: string;
  let targetSchema: string;
  let unsafeTargetSchema: string;
  let outsideSiblingRoot: string;
  let sourcePrisma: PrismaClient;
  let targetPrisma: PrismaClient;

  const baseDbUrl =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo';

  beforeAll(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'worklingo-backup-test-'));
    sourceDataDir = path.join(tempRoot, 'source-data');
    backupDir = path.join(tempRoot, 'backups');
    await mkdir(sourceDataDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });

    sourceSchema = `test_bk_src_${randomUUID().replaceAll('-', '')}`;
    targetSchema = `test_bk_tgt_${randomUUID().replaceAll('-', '')}`;
    unsafeTargetSchema = `test_bk_unsafe_${randomUUID().replaceAll('-', '')}`;
    outsideSiblingRoot = `${tempRoot}-sibling`;

    const srcUrlObj = new URL(baseDbUrl);
    srcUrlObj.searchParams.set('schema', sourceSchema);
    sourceDbUrl = srcUrlObj.toString();

    const tgtUrlObj = new URL(baseDbUrl);
    tgtUrlObj.searchParams.set('schema', targetSchema);
    targetDbUrl = tgtUrlObj.toString();

    sourcePrisma = new PrismaClient({ datasourceUrl: sourceDbUrl });
    targetPrisma = new PrismaClient({ datasourceUrl: targetDbUrl });
  }, 40_000);

  afterAll(async () => {
    await sourcePrisma?.$disconnect();
    await targetPrisma?.$disconnect();

    const cleanupClient = new PrismaClient({ datasourceUrl: baseDbUrl });
    try {
      if (sourceSchema) await cleanupClient.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${sourceSchema}" CASCADE`);
      if (targetSchema) await cleanupClient.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${targetSchema}" CASCADE`);
      if (unsafeTargetSchema) await cleanupClient.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${unsafeTargetSchema}" CASCADE`);
    } catch {
      // Ignore cleanup drop schema errors
    } finally {
      await cleanupClient.$disconnect();
    }

    if (tempRoot) {
      await rm(tempRoot, { force: true, recursive: true }).catch(() => undefined);
    }
    if (outsideSiblingRoot) {
      await rm(outsideSiblingRoot, { force: true, recursive: true }).catch(() => undefined);
    }
  });

  it('scripts/backup-local.ps1 rejects an unsafe backup path outside the allowed root', () => {
    const outsidePath = path.resolve(tempRoot, '../outside-backup');
    const result = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: outsidePath,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/outside|unsafe|allowed/i);
  }, 30_000);

  it('rejects a sibling backup path that only shares the allowed-root prefix', () => {
    const result = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: outsideSiblingRoot,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/outside|unsafe|allowed/i);
  }, 30_000);

  it('rejects a sibling restore target that only shares the allowed-root prefix', async () => {
    const syntheticBackup = path.join(tempRoot, 'synthetic-backup');
    await mkdir(syntheticBackup, { recursive: true });
    const sql = '-- path-safety fixture\n';
    await writeFile(path.join(syntheticBackup, 'database.sql'), sql, 'utf8');
    await writeFile(
      path.join(syntheticBackup, 'manifest.json'),
      JSON.stringify({
        version: '1.0',
        databaseDump: 'database.sql',
        schema: sourceSchema,
        files: {
          'database.sql': createHash('sha256').update(sql).digest('hex'),
        },
      }),
      'utf8',
    );

    const unsafeUrl = new URL(baseDbUrl);
    unsafeUrl.searchParams.set('schema', unsafeTargetSchema);
    const result = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: syntheticBackup,
      AllowedRoot: tempRoot,
      TargetDataDir: outsideSiblingRoot,
      TargetDatabaseUrl: unsafeUrl.toString(),
      TargetSchema: unsafeTargetSchema,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/outside|unsafe|allowed/i);
  }, 20_000);

  it('rejects manifest entries that resolve outside the backup directory', async () => {
    const maliciousBackup = path.join(tempRoot, 'malicious-backup');
    const outsideFile = path.join(tempRoot, 'outside.txt');
    const targetDir = path.join(tempRoot, 'manifest-target');
    const sql = '-- manifest-safety fixture\n';
    await mkdir(maliciousBackup, { recursive: true });
    await mkdir(path.join(targetDir, 'already-present'), { recursive: true });
    await writeFile(path.join(maliciousBackup, 'database.sql'), sql, 'utf8');
    await writeFile(outsideFile, 'outside', 'utf8');
    await writeFile(
      path.join(maliciousBackup, 'manifest.json'),
      JSON.stringify({
        version: '1.0',
        databaseDump: 'database.sql',
        schema: sourceSchema,
        files: {
          'database.sql': createHash('sha256').update(sql).digest('hex'),
          '../outside.txt': createHash('sha256').update('outside').digest('hex'),
        },
      }),
      'utf8',
    );

    const result = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: maliciousBackup,
      AllowedRoot: tempRoot,
      TargetDataDir: targetDir,
      TargetDatabaseUrl: targetDbUrl,
      TargetSchema: targetSchema,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/manifest.*outside|unsafe.*manifest/i);
  }, 20_000);

  it('rejects backup files that are not covered by the manifest', async () => {
    const incompleteManifestBackup = path.join(tempRoot, 'incomplete-manifest-backup');
    const targetDir = path.join(tempRoot, 'incomplete-manifest-target');
    const sql = '-- incomplete-manifest fixture\n';
    await mkdir(path.join(incompleteManifestBackup, 'data'), { recursive: true });
    await mkdir(path.join(targetDir, 'already-present'), { recursive: true });
    await writeFile(path.join(incompleteManifestBackup, 'database.sql'), sql, 'utf8');
    await writeFile(
      path.join(incompleteManifestBackup, 'data', 'unlisted.txt'),
      'not checksummed',
      'utf8',
    );
    await writeFile(
      path.join(incompleteManifestBackup, 'manifest.json'),
      JSON.stringify({
        version: '1.0',
        databaseDump: 'database.sql',
        schema: sourceSchema,
        files: {
          'database.sql': createHash('sha256').update(sql).digest('hex'),
        },
      }),
      'utf8',
    );

    const result = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: incompleteManifestBackup,
      AllowedRoot: tempRoot,
      TargetDataDir: targetDir,
      TargetDatabaseUrl: targetDbUrl,
      TargetSchema: targetSchema,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/not covered by the manifest/i);
  }, 20_000);

  it('fails closed when the target database emptiness check cannot be completed', async () => {
    const syntheticBackup = path.join(tempRoot, 'unreachable-database-backup');
    const targetDir = path.join(tempRoot, 'unreachable-database-target');
    const sql = '-- database-safety fixture\n';
    await mkdir(syntheticBackup, { recursive: true });
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(syntheticBackup, 'database.sql'), sql, 'utf8');
    await writeFile(
      path.join(syntheticBackup, 'manifest.json'),
      JSON.stringify({
        version: '1.0',
        databaseDump: 'database.sql',
        schema: sourceSchema,
        files: {
          'database.sql': createHash('sha256').update(sql).digest('hex'),
        },
      }),
      'utf8',
    );

    const unreachableUrl = new URL(baseDbUrl);
    unreachableUrl.pathname = `/missing_${randomUUID().replaceAll('-', '')}`;
    unreachableUrl.searchParams.set('schema', unsafeTargetSchema);

    const result = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: syntheticBackup,
      AllowedRoot: tempRoot,
      TargetDataDir: targetDir,
      TargetDatabaseUrl: unreachableUrl.toString(),
      TargetSchema: unsafeTargetSchema,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(
      /unable to verify target database schema is empty/i,
    );
  }, 20_000);

  it('removes an incomplete artifact when database backup fails', async () => {
    const failedBackupRoot = path.join(tempRoot, 'failed-backups');
    const result = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: failedBackupRoot,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
      Schema: `missing_${randomUUID().replaceAll('-', '')}`,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/database dump command failed/i);
    await expect(readdir(failedBackupRoot)).resolves.toEqual([]);
  }, 20_000);

  it('backs up test database records and files with manifest and sha256 checksums', async () => {
    // 1. Prepare test database data
    await sourcePrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${sourceSchema}"`);
    await sourcePrisma.$executeRawUnsafe(`
      CREATE TABLE "${sourceSchema}"."TestRecord" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const testId = randomUUID();
    const literalSchemaName = `Literal ${sourceSchema}. must stay unchanged`;
    await sourcePrisma.$executeRawUnsafe(`
      INSERT INTO "${sourceSchema}"."TestRecord" ("id", "name") VALUES ('${testId}', 'Learner Test Record')
    `);
    await sourcePrisma.$executeRawUnsafe(`
      INSERT INTO "${sourceSchema}"."TestRecord" ("id", "name") VALUES ('${randomUUID()}', '${literalSchemaName}')
    `);

    // 2. Prepare test file in source data dir
    const testFileContent = 'Hello WorkLingo storage test asset';
    const testFilePath = path.join(sourceDataDir, 'sample-audio.txt');
    await writeFile(testFilePath, testFileContent, 'utf8');
    const expectedChecksum = createHash('sha256').update(testFileContent).digest('hex');

    // 3. Execute backup script
    const result = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: backupDir,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
      Schema: sourceSchema,
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);

    // 4. Verify backup artifact structure and manifest
    const manifestPathMatch = (result.stdout + result.stderr).match(/BACKUP_DIR:\s*(.+)/);
    expect(manifestPathMatch).not.toBeNull();
    const createdBackupDir = (manifestPathMatch?.[1] ?? '').trim();

    expect(existsSync(createdBackupDir)).toBe(true);
    expect(path.basename(createdBackupDir)).toMatch(
      /^backup-\d{8}-\d{6}-[a-f0-9]{8}$/,
    );
    const manifestFile = path.join(createdBackupDir, 'manifest.json');
    expect(existsSync(manifestFile)).toBe(true);

    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    expect(manifest).toMatchObject({
      version: '1.0',
      databaseDump: expect.any(String),
      files: expect.any(Object),
    });

    // Checksum for file must match
    const recordedFileHash = manifest.files['data/sample-audio.txt'] || manifest.files['sample-audio.txt'];
    expect(recordedFileHash).toBe(expectedChecksum);
  }, 20_000);

  it('scripts/restore-local.ps1 rejects non-empty target directory or non-empty database', async () => {
    const backupListResult = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: backupDir,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
      Schema: sourceSchema,
    });
    const match = (backupListResult.stdout + backupListResult.stderr).match(/BACKUP_DIR:\s*(.+)/);
    const createdBackupDir = (match?.[1] ?? '').trim();

    // Prepare a target containing an empty directory. It is still not empty.
    const nonEmptyTargetDir = path.join(tempRoot, 'non-empty-target');
    await mkdir(path.join(nonEmptyTargetDir, 'existing-folder'), { recursive: true });

    const result = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: createdBackupDir,
      AllowedRoot: tempRoot,
      TargetDataDir: nonEmptyTargetDir,
      TargetDatabaseUrl: targetDbUrl,
      TargetSchema: targetSchema,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/not empty|refuse|already exists/i);
  }, 20_000);

  it(
    'rehearses complete restore into an empty target schema and directory, verifying data integrity',
    async () => {
      // 1. Run fresh backup of source
    const backupResult = runPowerShellScript('scripts/backup-local.ps1', {
      BackupRoot: backupDir,
      AllowedRoot: tempRoot,
      DataDir: sourceDataDir,
      DatabaseUrl: sourceDbUrl,
      Schema: sourceSchema,
    });
    expect(backupResult.status, backupResult.stderr || backupResult.stdout).toBe(0);
    const match = (backupResult.stdout + backupResult.stderr).match(/BACKUP_DIR:\s*(.+)/);
    const createdBackupDir = (match?.[1] ?? '').trim();

    // 2. Prepare completely empty target data directory
    const cleanTargetDataDir = path.join(tempRoot, 'restored-data');
    await mkdir(cleanTargetDataDir, { recursive: true });

    // 3. Prepare clean target schema
    await targetPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${targetSchema}" CASCADE`);

    // 4. Run restore
    const restoreResult = runPowerShellScript('scripts/restore-local.ps1', {
      BackupDir: createdBackupDir,
      AllowedRoot: tempRoot,
      TargetDataDir: cleanTargetDataDir,
      TargetDatabaseUrl: targetDbUrl,
      TargetSchema: targetSchema,
    });

    expect(restoreResult.status).toBe(0);

    // 5. Verify restored file and checksum
    const restoredFilePath = path.join(cleanTargetDataDir, 'sample-audio.txt');
    expect(existsSync(restoredFilePath)).toBe(true);
    const restoredContent = await readFile(restoredFilePath, 'utf8');
    expect(restoredContent).toBe('Hello WorkLingo storage test asset');

    // 6. Verify restored database records
    const records = await targetPrisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
      `SELECT "id", "name" FROM "${targetSchema}"."TestRecord" ORDER BY "id"`,
    );
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.name)).toContain('Learner Test Record');
    expect(records.map((record) => record.name)).toContain(
      `Literal ${sourceSchema}. must stay unchanged`,
    );
  }, 30_000);
});
