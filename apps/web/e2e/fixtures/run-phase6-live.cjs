/* Real local backend + disposable PostgreSQL. No production credentials/services. */
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const evidence = path.join(root, 'docs/ui-redesign/evidence/phase6/live'); fs.mkdirSync(evidence, { recursive: true });
const run = process.env.WORKLINGO_PHASE6_RUN || 'initial';
const owner = crypto.randomUUID().replaceAll('-', '');
const schema = `worklingo_e2e_${owner}`;
const name = `worklingo-liquid-glass-phase6-${owner.slice(0, 10)}`;
const password = crypto.randomBytes(24).toString('hex');
const sessionSecret = crypto.randomBytes(32).toString('hex');
const adminPassword = crypto.randomBytes(24).toString('hex');
const childEnv = { ...process.env, POSTGRES_PASSWORD: password };
const docker = (...args) => cp.execFileSync('docker', args, { cwd: root, encoding: 'utf8', env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const record = { sourceCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), timestamp: new Date().toISOString(), command: 'node apps/web/e2e/fixtures/run-phase6-live.cjs', fixtureOnly: false, providers: 'existing fake evaluation/STT/TTS; not live commercial providers', projects: process.argv.slice(2).length ? process.argv.slice(2) : ['onboarding-desktop', 'foundation-desktop', 'ielts-full-mock-desktop', 'admin-desktop'], container: name, result: 'BLOCKED', cleanup: false };
let containerCreated = false;
const redact = text => [password, adminPassword, sessionSecret].reduce((value, secret) => value.replaceAll(secret, '[REDACTED]'), text).replace(/Bearer\s+[\w.-]+/giu, 'Bearer [REDACTED]').replace(/((?:set-cookie|authorization):)[^\r\n]*/giu, '$1 [REDACTED]');

(async () => {
  try {
    assert.ok(!fs.existsSync(path.join(root, '.env')), 'Refuse automatic loading of an unreviewed workspace .env');
    record.image = docker('image', 'inspect', 'postgres:17-alpine', '--format', '{{.Id}}');
    docker('run', '--rm', '--detach', '--name', name, '--label', `worklingo.phase6.owner=${owner}`, '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data:rw', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_USER=phase6', '--env', 'POSTGRES_DB=worklingo_phase6', 'postgres:17-alpine');
    containerCreated = true;
    const binding = docker('port', name, '5432/tcp'); assert.match(binding, /^127\.0\.0\.1:\d+$/u);
    const port = Number(binding.split(':').at(-1));
    record.database = { host: '127.0.0.1', port, database: 'worklingo_phase6', schema, disposable: true, storage: 'container tmpfs only' };
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { docker('exec', name, 'pg_isready', '-U', 'phase6', '-d', 'worklingo_phase6'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
    }
    assert.ok(ready, 'Disposable PostgreSQL not ready');
    const args = ['--filter', '@worklingo/web', 'exec', 'playwright', 'test', '-c', 'playwright.phase6-live.config.ts', '--no-deps', ...record.projects.map(project => `--project=${project}`)];
    record.optimizedWeb = true;
    record.playwrightCommand = 'pnpm ' + args.join(' ');
    const env = { ...childEnv, TEST_DATABASE_URL: `postgresql://phase6:${password}@127.0.0.1:${port}/worklingo_phase6`, DATABASE_URL: '', WORKLINGO_E2E_SCHEMA: schema, WORKLINGO_E2E_API_PORT: '34106', WORKLINGO_E2E_WEB_PORT: '33106', WORKLINGO_ADMIN_EMAIL: 'phase6-admin@fixture.invalid', WORKLINGO_ADMIN_PASSWORD: adminPassword, SESSION_SECRET: sessionSecret };
    env.WORKLINGO_E2E_SCREENSHOT_DIR = path.join(evidence, run);
    record.harnessSHA256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
    record.e2eDiffSHA256 = crypto.createHash('sha256').update(cp.execFileSync('git', ['diff', 'HEAD', '--', 'apps/web/e2e'], { cwd: root })).digest('hex');
    const pnpm = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/pnpm/bin/pnpm.cjs');
    assert.ok(fs.existsSync(pnpm), 'Installed pnpm CLI not found beside the observed Node runtime');
    // npm_execpath is supplied by pnpm exec; otherwise use the installed pnpm CLI.
    const child = cp.spawn(process.execPath, [pnpm, ...args], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(path.join(evidence, `${run}.log`));
    const forward = stream => { let pending = ''; stream.on('data', chunk => { pending += chunk; const lines = pending.split('\n'); pending = lines.pop(); for (const line of lines) log.write(redact(line).trimEnd() + '\n'); }); stream.on('end', () => { if (pending) log.write(redact(pending).trimEnd() + '\n'); }); };
    forward(child.stdout); forward(child.stderr);
    const exit = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
    await new Promise(resolve => log.end(resolve));
    record.exitCode = exit; record.result = exit === 0 ? 'PASS' : 'FAIL';
  } catch (error) {
    record.error = redact(String(error.message)); process.exitCode = 1;
  } finally {
    if (containerCreated) {
      try {
        assert.equal(docker('inspect', '--format', '{{ index .Config.Labels "worklingo.phase6.owner" }}', name), owner);
        docker('stop', '--time', '10', name); record.cleanup = true;
      } catch (error) { record.cleanupError = redact(String(error.message)); process.exitCode = 1; }
    }
    record.finished = new Date().toISOString();
    fs.writeFileSync(path.join(evidence, `${run}.json`), JSON.stringify(record, null, 2) + '\n');
    console.log(JSON.stringify({ result: record.result, cleanup: record.cleanup, container: name, projects: record.projects, error: record.error }, null, 2));
    if (record.result !== 'PASS') process.exitCode = 1;
  }
})();
