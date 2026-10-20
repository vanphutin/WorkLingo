/* Diagnostic only: one owned tmpfs server; independent Vitest/schema per child. */
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const owner = crypto.randomUUID().replaceAll('-', '');
const container = `worklingo-placement-${owner.slice(0, 12)}`;
const password = crypto.randomBytes(24).toString('hex');
const secret = crypto.randomBytes(32).toString('hex');
const dockerEnv = { ...process.env, POSTGRES_PASSWORD: password };
const docker = (...args) => cp.execFileSync('docker', args, { cwd: root, env: dockerEnv, windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const stamp = () => ({ wall: new Date().toISOString(), monotonicNs: process.hrtime.bigint().toString() });
const redact = text => [password, secret].reduce((value, item) => value.replaceAll(item, '[REDACTED]'), text)
  .replace(/Bearer\s+[\w.-]+/giu, 'Bearer [REDACTED]')
  .replace(/((?:set-cookie|authorization):)[^\r\n]*/giu, '$1 [REDACTED]');
const directory = process.argv[2] || 'matrix';
assert.match(directory, /^matrix(?:-[a-z]+)?$/u, 'Evidence directory must be a local matrix namespace');
const evidence = path.join(__dirname, directory);
fs.mkdirSync(evidence, { recursive: true });
const record = { owner, container, sourceCommit: git('rev-parse', 'HEAD'), started: stamp(), result: 'BLOCKED', cleanup: false, cells: [] };
const source = git('ls-files', '--', 'apps', 'packages').split('\n').filter(Boolean);
record.sourceSHA256 = Object.fromEntries(source.map(file => [file, digest(file)]));
record.launcherSHA256 = digest(path.relative(root, __filename));
let created = false;

(async () => {
  try {
    assert.equal(root.replaceAll('\\', '/'), 'D:/Projects/WorkLingo-Integration');
    assert.equal(git('branch', '--show-current'), 'integration/worklingo-release-candidate');
    assert.ok(!fs.existsSync(path.join(root, '.env')), 'Refuse workspace .env');
    assert.ok(!fs.existsSync(path.join(evidence, 'result.json')), 'Refuse overwriting matrix evidence');
    record.environment = { node: process.version, platform: process.platform, image: docker('image', 'inspect', 'postgres:17-alpine', '--format', '{{.Id}}'), docker: docker('version', '--format', '{{.Server.Version}}'), providers: 'fake', backgroundWorker: false };
    docker('run', '--rm', '--detach', '--name', container, '--label', `worklingo.placement.owner=${owner}`, '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data:rw', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_USER=placement', '--env', 'POSTGRES_DB=placement_diagnostics', 'postgres:17-alpine');
    created = true;
    const binding = docker('port', container, '5432/tcp');
    assert.match(binding, /^127\.0\.0\.1:\d+$/u);
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { docker('exec', container, 'pg_isready', '-U', 'placement', '-d', 'placement_diagnostics'); ready = true; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert.ok(ready, 'Owned database not ready within bounded readiness polling');
    record.database = { binding, disposable: true, storage: 'tmpfs', server: docker('exec', container, 'psql', '-U', 'placement', '-d', 'placement_diagnostics', '-Atc', 'SELECT version()') };
    const databaseUrl = `postgresql://placement:${password}@${binding}/placement_diagnostics`;
    const pnpm = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/pnpm/bin/pnpm.cjs');
    assert.ok(fs.existsSync(pnpm));
    // Bound the observed DB clock by host send/receive times. These sequential
    // samples characterize this run, not the destroyed historical database.
    const { createRequire } = require('node:module');
    const { PrismaClient } = createRequire(path.join(root, 'apps/api/package.json'))('@prisma/client');
    const clock = new PrismaClient({ datasourceUrl: databaseUrl });
    record.clockSamples = [];
    try {
      await clock.$connect();
      for (let index = 0; index < 64; index++) {
        const beforeMs = Date.now();
        const mono = process.hrtime.bigint();
        const [sample] = await clock.$queryRaw`SELECT (extract(epoch FROM clock_timestamp()) * 1000)::text AS "databaseEpochMs", current_setting('transaction_isolation') AS isolation`;
        const afterMs = Date.now();
        record.clockSamples.push({ beforeMs, afterMs, durationNs: (process.hrtime.bigint() - mono).toString(), ...sample });
      }
    } finally { await clock.$disconnect(); }
    const execute = (cell, role, files, diagnostics) => new Promise(resolve => {
      const started = stamp();
      const logName = `${cell}-${role}.log`;
      const stream = fs.createWriteStream(path.join(evidence, logName), { flags: 'wx' });
      const scratch = path.join(root, '.superpowers/sdd/placement-investigation-plan', `${owner}-${cell}-${role}`);
      fs.mkdirSync(scratch, { recursive: true });
      const env = { ...process.env, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl, SESSION_SECRET: secret, WORKLINGO_DATA_DIR: scratch,
        WORKLINGO_PLACEMENT_REPEATS: '30', WORKLINGO_PLACEMENT_DIAGNOSTICS: diagnostics, JOB_WORKER_ENABLED: 'false' };
      const args = ['--filter', '@worklingo/api', 'exec', 'vitest', 'run', ...files];
      const child = cp.spawn(process.execPath, [pnpm, ...args], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const forward = input => {
        let pending = '';
        input.on('data', chunk => { pending += chunk; const lines = pending.split('\n'); pending = lines.pop(); for (const line of lines) stream.write(redact(line).trimEnd() + '\n'); });
        input.on('end', () => { if (pending) stream.write(redact(pending).trimEnd() + '\n'); });
      };
      forward(child.stdout); forward(child.stderr);
      let error;
      child.on('error', cause => { error = redact(String(cause)); });
      child.on('close', async (exitCode, signal) => {
        await new Promise(done => stream.end(done));
        resolve({ role, started, finished: stamp(), exitCode, signal, error, command: `pnpm ${args.join(' ')}`, diagnostics, log: logName });
      });
    });
    const placement = ['test/integration/placement-isolation.integration.spec.ts'];
    const load = ['test/integration/jobs-worker.integration.spec.ts', 'test/integration/placement-attempt.integration.spec.ts', 'test/integration/placement-confirmation.integration.spec.ts', 'test/integration/onboarding-self-placement.integration.spec.ts', 'test/integration/ielts-mock-workflow.integration.spec.ts', 'test/integration/ielts-study-session.integration.spec.ts'];
    for (const cell of [{ name: 'single', workers: 1, load: false }, { name: 'parallel', workers: 2, load: false }, { name: 'single-load', workers: 1, load: true }, { name: 'parallel-load', workers: 2, load: true }]) {
      const started = stamp();
      const children = Array.from({ length: cell.workers }, (_, index) => execute(cell.name, `placement${index}`, placement, index === 0 ? 'boundary' : 'failure'));
      if (cell.load) children.push(execute(cell.name, 'load', load, 'failure'));
      const results = await Promise.all(children);
      const row = { ...cell, started, finished: stamp(), children: results };
      record.cells.push(row);
      fs.writeFileSync(path.join(evidence, `${cell.name}.json`), JSON.stringify(row, null, 2) + '\n');
      console.log(JSON.stringify({ cell: cell.name, exitCodes: results.map(item => item.exitCode) }));
      // Continue finite cells after a failure to preserve the comparative evidence.
    }
    assert.ok(source.every(file => digest(file) === record.sourceSHA256[file]), 'Source mutated during matrix');
    record.result = record.cells.every(cell => cell.children.every(child => child.exitCode === 0)) ? 'PASS' : 'FAIL';
  } catch (error) { record.error = redact(String(error.message)); }
  finally {
    if (created) {
      try { assert.equal(docker('inspect', '--format', '{{ index .Config.Labels "worklingo.placement.owner" }}', container), owner); docker('stop', '--time', '10', container); record.cleanup = true; }
      catch (error) { record.cleanupError = redact(String(error.message)); }
    }
    record.finished = stamp();
    fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ result: record.result, cleanup: record.cleanup, error: record.error }));
    if (record.result !== 'PASS' || !record.cleanup) process.exitCode = 1;
  }
})();
