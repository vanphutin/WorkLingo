// Read-only full-branch scope and production-import checks; not a backend security audit.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const baseline = '7a5e383763ccd63c4befa4ab07a5559ba7cabfbe';
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const files = git('ls-files', 'apps/web/src').split('\n').filter(Boolean);
const changed = git('diff', '--name-only', baseline, 'HEAD').split('\n').filter(Boolean);
const protectedPaths = ['apps/api', 'packages', 'pnpm-lock.yaml', 'package.json', 'apps/web/package.json', 'apps/web/next.config.ts', 'apps/web/src/lib/api'];
assert.equal(git('diff', baseline, 'HEAD', '--', ...protectedPaths), '', 'Backend/contracts/API clients/dependencies/config changed');
assert.equal(git('diff', 'HEAD', '--', 'apps/web/src'), '', 'Uncommitted product source must be qualified separately');
const pages = files.filter(file => /\/app\/.*\/page\.tsx$/u.test(file) || file === 'apps/web/src/app/page.tsx');
assert.equal(pages.length, 34);
const leaks = [];
for (const file of files.filter(file => /\.[cm]?[jt]sx?$/u.test(file) && !/\.(test|spec)\./u.test(file))) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu)) {
    if (/(?:e2e|fixtures|phase6-zoom|playwright|test-results|\.superpowers)/u.test(match[1])) leaks.push({ file, imported: match[1] });
  }
}
assert.deepEqual(leaks, [], 'Test-only import in production source');
assert.ok(!changed.some(file => /(?:^|\/)(?:\.next|node_modules|test-results)(?:\/|$)/u.test(file)), 'Generated artifacts tracked');
const historical = JSON.parse(fs.readFileSync(path.join(__dirname, '../phase5/manifest.json'), 'utf8'));
for (const [file, digest] of Object.entries(historical.artifactSHA256)) assert.equal(hash('docs/ui-redesign/evidence/phase5/' + file), digest, 'Historical Phase5 artifact changed: ' + file);
const report = {
  sourceCommit: git('rev-parse', 'HEAD'), timestamp: new Date().toISOString(), command: 'node docs/ui-redesign/evidence/phase6/boundaries.cjs', result: 'PASS', baseline,
  protectedPathsUnchanged: protectedPaths, applicationPages: pages, productionTestImports: leaks,
  changedFrontendFiles: changed.filter(file => file.startsWith('apps/web/')),
  productionSourceSHA256: Object.fromEntries(files.filter(file => !/\.(test|spec)\./u.test(file)).map(file => [file, hash(file)])),
  immutablePhase5ArtifactsVerified: Object.keys(historical.artifactSHA256).length,
  limits: ['Import/path checks do not prove all business semantics or total backend security; independent full diff review and functional results are separate gates.'],
};
fs.writeFileSync(path.join(__dirname, 'boundaries.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ result: report.result, routes: pages.length, productionSources: Object.keys(report.productionSourceSHA256).length, historicalArtifacts: report.immutablePhase5ArtifactsVerified }));
