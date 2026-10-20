// Seal only Phase6 artifacts. Never rewrite historical evidence or original checkout.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const logs = path.join(__dirname, 'logs'); fs.mkdirSync(logs, { recursive: true });
const scratch = path.join(root, '.superpowers/sdd/02-redesign-plan');
for (const file of fs.readdirSync(scratch).filter(file => /^phase6-.*\.log$/u.test(file))) {
  const text = fs.readFileSync(path.join(scratch, file), 'utf8').replace(/\x1b\[[\d;]*m/gu, '');
  fs.writeFileSync(path.join(logs, file), text.split(/\r?\n/u).map(line => line.trimEnd()).join('\n').trimEnd() + '\n');
}
const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'summary.json'), 'utf8'));
assert.equal(summary.routeVerified, 34); assert.equal(summary.ownerTests, 105); assert.deepEqual(summary.ownerFailures, []);
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
for (const run of ['optimized-final', 'admin-isolated-final']) { const record = read('live/' + run + '.json'); assert.equal(record.result, 'PASS'); assert.equal(record.cleanup, true); }
const runs = [
  ['web-final', 'pnpm --filter @worklingo/web test', '600cd1f', 'PASS405/405', 'logs/phase6-unit-final.log', 'component/unit85 files'],
  ['lint-final', 'pnpm --filter @worklingo/web lint', '600cd1f', 'PASS', 'logs/phase6-lint-final.log', 'web src only'],
  ['types-final', 'pnpm --filter @worklingo/web typecheck', '600cd1f', 'PASS', 'logs/phase6-typecheck-final.log', 'web tsconfig'],
  ['i18n-final', 'pnpm i18n:check', '600cd1f', 'PASS', 'logs/phase6-i18n-final.log', 'static dictionaries/contracts'],
  ['i18n-tests', 'pnpm test:i18n', '600cd1f', 'PASS7/7', 'logs/phase6-i18n-tests.log', 'checker tests'],
  ['build-fixed', 'pnpm --filter @worklingo/web build', '600cd1f', 'PASS', 'logs/phase6-production-build-fixed.log', 'normal optimized .next, E2E mode unset'],
  ['build-live-fixed', 'WORKLINGO_E2E_MODE=true WORKLINGO_API_URL=http://127.0.0.1:34106 pnpm --filter @worklingo/web build', '600cd1f', 'PASS', 'logs/phase6-live-production-build-fixed.log', 'optimized .next-e2e separate loopback rewrite'],
  ['owner105', 'WORKLINGO_FOUNDATION_PRODUCTION=true WORKLINGO_PHASE4_EVIDENCE_ROOT=../../../docs/ui-redesign/evidence/phase6/regression WORKLINGO_PHASE4_RUN=phase6-final pnpm --filter @worklingo/web exec playwright test -c playwright.phase4.config.ts', '18e00fd', 'PASS105/105', 'logs/phase6-owner-regression.log', 'real app, fake API data, Chromium'],
  ['affected18', 'WORKLINGO_FOUNDATION_PRODUCTION=true WORKLINGO_PHASE4_EVIDENCE_ROOT=../../../docs/ui-redesign/evidence/phase6/operations-regression-final WORKLINGO_PHASE4_RUN=phase6-operations-fixed pnpm --filter @worklingo/web exec playwright test -c playwright.phase4.config.ts liquid-glass-phase4-settings.spec.ts', '3ad9bf2', 'PASS18/18', 'logs/phase6-operations-owner-final.log', 'after Operations fix; same seven settings/operations routes'],
  ['cross-final', 'pnpm --filter @worklingo/web exec playwright test -c playwright.phase6.config.ts liquid-glass-phase6-cross.spec.ts', '600cd1f', 'PASS21/21', 'logs/phase6-cross-fixed-final.log', '8 routes144cells; Firefox dynamic contrast BLOCKED, not part of static PASS claim'],
  ['native-final', 'pnpm --filter @worklingo/web exec playwright test -c playwright.phase6.config.ts liquid-glass-phase6-native.spec.ts --project=chromium', 'aace62c', 'PASS4/4', 'logs/phase6-native-capture-final.log', '16 samples; actual zoom not CSS; tested source hash in each JSON'],
  ['error-final', 'pnpm --filter @worklingo/web exec playwright test -c playwright.phase6-error.config.ts', 'aace62c', 'PASS4/4', 'logs/phase6-error-final.log', 'immutable aace62c snapshot; only Login injection; error owner unchanged'],
  ['performance-fixed', 'pnpm --filter @worklingo/web exec playwright test -c playwright.phase6.config.ts liquid-glass-phase6-performance.spec.ts --project=chromium', '600cd1f', 'PASS execution18 observations', 'logs/phase6-performance-fixed-final.log', 'lab fixture no throttle, not field INP/CWV or physical FPS'],
  ['cls-fixed', 'pnpm --filter @worklingo/web exec playwright test -c playwright.phase6-cls.config.ts', '600cd1f', 'PASS2/2', 'logs/phase6-cls-fixed-final.log', '3 current insertion samples and held-response geometry; original/pre-fix independent snapshots retained'],
  ['scope-final', 'node docs/ui-redesign/evidence/phase6/boundaries.cjs', '69654e4', 'PASS', 'logs/phase6-boundaries-final.log', '207 production hashes,34 pages, protected paths and historical529 artifacts; not exhaustive semantics'],
  ['preservation-final', 'node docs/ui-redesign/evidence/verify-phase1.cjs %TEMP%/worklingo-liquid-glass-origin-20261019.json', '69654e4', 'PASS1295 original files/status/main', 'logs/phase6-preservation-final.log', 'Read-only original preservation; no original files copied'],
  ['whitespace-final', 'git diff --cached --check', '69654e4', 'PASS', 'logs/phase6-whitespace-final.log', 'Task-owned staged files only; final post-commit verifier checks clean status'],
  ['secrets-final', 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/qualification/scan-secrets.ps1', '69654e4', 'PASS', 'logs/phase6-secret-scan-final.log', 'Tracked files including staged evidence; environment/private-key-block checks only, not full secret/security certification'],
].map(([id, command, source, result, log, limitations]) => ({ id, command, sourceCommit: git('rev-parse', source), sourceMeaning: 'Effective tested bytes in this commit; per-case JSON may record an earlier HEAD plus a working harness diff. Not a claim every test started after commit creation.', result, log, timestamp: fs.statSync(path.join(scratch, path.basename(log))).mtime.toISOString(), timestampMeaning: 'Original log last-write/execution finish; per-case times in JSON and Vitest log', environment: 'Windows,Node20.20.1,pnpm10.34.1,Next16.3.8,Playwright1.63; precise browser versions in per-case JSON', limitations }));
const sourceFiles = git('ls-files', 'apps/web/src', 'apps/web/e2e', 'apps/web/playwright.phase6*.ts').split('\n').filter(Boolean);
const docs = ['progress.md', '02-redesign-plan.md', '03-route-coverage.md', '04-design-system.md', 'phase6-final-qa.md', 'release-readiness.md', 'merge-plan.md'];
const artifacts = walk(__dirname).filter(file => path.basename(file) !== 'manifest.json').sort();
const provenanceGroups = Object.fromEntries(runs.map(run => [run.id, { ...run, fixtureData: run.id.startsWith('build') || ['web-final', 'lint-final', 'types-final', 'i18n-final', 'i18n-tests'].includes(run.id) ? 'Existing source/component/checker fixtures; no production data' : 'Existing Phase4/5 route-owner fixtures; synthetic IDs and test data only' }]));
provenanceGroups.exploratory = { sourceCommit: null, result: 'DIAGNOSTIC ONLY: initial failure or superseded run; not release-pass evidence', command: 'Exact command/source may be absent from earliest probes; consult retained JSON/log footer. Not reconstructed as a certified run.', environment: 'Same local Windows/managed browser environment; individual records take precedence', fixtureData: 'Synthetic local fixtures/isolated snapshots only', limitations: 'Missing early probe metadata is explicit; excluded from acceptance gates.' };
provenanceGroups.package = { sourceCommit: git('rev-parse', 'HEAD'), result: 'NOT APPLICABLE: report/helper/seal, not a test execution', command: 'Current evidence helper generation or independent review as described in file', environment: 'Current isolated worktree; no original source mutation', fixtureData: 'Path/status/hash metadata, synthetic evidence and preserved logs', limitations: 'Artifact hash proves bytes, not an additional independent test pass.' };
for (const run of ['initial', 'generated-client', 'reconciled-ui', 'optimized-final', 'operations-fixed-final', 'admin-isolated-final']) {
  const file = path.join(__dirname, 'live', run + '.json');
  if (fs.existsSync(file)) { const record = JSON.parse(fs.readFileSync(file, 'utf8')); provenanceGroups['live-' + run] = { ...record, fixtureData: 'Disposable PostgreSQL tmpfs/schema; seeded test accounts/content; fake evaluation/STT/TTS; Azure readiness endpoint stub only', limitations: 'Selected real API/DB journeys, not commercial provider/full live exam certification; failed earlier runs retained.' }; }
}
const groupFor = file => {
  const logged = runs.find(run => run.log === file); if (logged) return logged.id;
  if (file.startsWith('live/')) { const run = file.slice(5).split(/[/.]/u)[0]; if (provenanceGroups['live-' + run]) return 'live-' + run; }
  for (const [prefix, group] of [['regression/', 'owner105'], ['operations-regression-final/', 'affected18'], ['cross-fixed-final/', 'cross-final'], ['native-capture-final/', 'native-final'], ['native-zoom/', 'native-final'], ['error-final/', 'error-final'], ['error/', 'error-final'], ['performance-fixed-final/', 'performance-fixed'], ['operations-fixed-final/', 'cls-fixed'], ['operations-shift/operations-fixed-final/', 'cls-fixed']]) if (file.startsWith(prefix)) return group;
  if (file.startsWith('logs/') || /^(?:cross-|capability-|cls-|firefox-|native-final|error-initial|operations-before|operations-shift\/operations-before|performance-final)/u.test(file)) return 'exploratory';
  return 'package';
};
const artifactProvenance = Object.fromEntries(artifacts.map(absolute => {
  const file = path.relative(__dirname, absolute).replaceAll('\\', '/');
  let own = {};
  if (file.endsWith('.json')) { try { const value = JSON.parse(fs.readFileSync(absolute, 'utf8')); own = { recordedSourceCommit: value.sourceCommit, recordedTimestamp: value.timestamp, recordedResult: value.result ?? value.status, recordedCommand: value.command, testSourceSHA256: value.testSourceSHA256 }; } catch { /* Helper JSON with another format is covered by its hash/group. */ } }
  const originalLog = file.startsWith('logs/') ? path.join(scratch, path.basename(file)) : absolute;
  return [file, { group: groupFor(file), fileTimestamp: fs.statSync(fs.existsSync(originalLog) ? originalLog : absolute).mtime.toISOString(), ...own }];
}));
const manifest = {
  codeHead: '69654e4dd6fd3fa7ed62249f69e36f20fd4f402d', productHead: '600cd1f865ae05e67735f712129f414c69627cf0', sealedFromHead: git('rev-parse', 'HEAD'), timestamp: new Date().toISOString(), entry: 'b9ae26ccb1dcfe6817ad451e33943529de11270f', baselineMain: '7a5e383763ccd63c4befa4ab07a5559ba7cabfbe', readiness: 'YELLOW',
  runs, liveRuns: ['optimized-final', 'admin-isolated-final'].map(run => ({ run, ...read('live/' + run + '.json') })),
  sourceSHA256: Object.fromEntries(sourceFiles.map(file => [file, hash(path.join(root, file))])),
  documentSHA256: Object.fromEntries(docs.map(file => [file, hash(path.join(__dirname, '../..', file))])),
  artifactSHA256: Object.fromEntries(artifacts.map(file => [path.relative(__dirname, file).replaceAll('\\', '/'), hash(file)])),
  provenanceGroups, artifactProvenance,
  limits: ['Results span explicitly named source-equivalent runs; unchanged source must hash-match after documentation commits.', 'Exploratory failures and rejected diagnostics retained, not counted as release passes.', 'Live providers/physical hardware/assistive tech/field performance/full live exam expiry-scoring remain unqualified.', '52 original dirty files require human-owned preservation/reconciliation; ancestry is not integration approval.'],
};
fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ codeHead: manifest.codeHead, productHead: manifest.productHead, sourceHashes: sourceFiles.length, artifacts: Object.keys(manifest.artifactSHA256).length, readiness: manifest.readiness }));
