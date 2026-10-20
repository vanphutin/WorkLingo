const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../../..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
const inventory = readJson('source-inventory.json');
const baseline = readJson('public-baseline.json');
const routeDoc = fs.readFileSync(path.join(__dirname, '../03-route-coverage.md'), 'utf8');
const rows = routeDoc.split('\n').filter((line) => line.startsWith('| `/'));
const routes = rows.map((line) => line.split('|')[1].trim().replaceAll('`', ''));
assert.equal(routes.length, new Set(routes).size, 'Duplicate route rows');
assert.deepEqual([...routes].sort(), inventory.routes.map((route) => route.route).sort());
assert.equal(inventory.routes.length, 34);
assert.equal(inventory.layouts.length, 14);

let checkedHashes = 0;
for (const [file, expected] of Object.entries(inventory.sourceHashes)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  assert.equal(actual, expected, `Source changed since Phase 0 snapshot: ${file}`);
  checkedHashes += 1;
}
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
assert.equal(walk(path.join(root, 'apps/web/src')).length, checkedHashes, 'Source file set changed');

assert.equal(baseline.observations.length, 18);
for (const observation of baseline.observations) {
  assert.equal(observation.httpStatus, 200);
  assert.equal(observation.overflowPixels, 0);
  assert.equal(observation.pageErrorCount, 0);
  assert.equal(observation.h1Count, 1);
  assert.equal(observation.theme, observation.theme === 'light' ? 'light' : 'dark');
  assert.ok(fs.statSync(path.join(__dirname, observation.screenshot)).size > 0);
}

let checkedLinks = 0;
const docs = ['01-ui-audit.md', '02-redesign-plan.md', '03-route-coverage.md', 'progress.md'];
for (const name of docs) {
  const file = path.join(__dirname, '..', name);
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(!/[\t ]+$/m.test(text), `Trailing whitespace: ${name}`);
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'), `EOF whitespace: ${name}`);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^https?:/.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), target.split('#')[0])), `Missing link ${target}`);
    checkedLinks += 1;
  }
}

const risks = {};
for (const row of rows) {
  const risk = row.split('|')[7].trim();
  risks[risk] = (risks[risk] ?? 0) + 1;
}
const result = { date: '2026-10-19', timezone: 'Asia/Saigon', routes: routes.length,
  layouts: inventory.layouts.length, riskGroups: risks, unchangedSourceFiles: checkedHashes,
  publicCaptures: baseline.observations.length, checkedLocalLinks: checkedLinks,
  documentWhitespace: 'passed', applicationSourcePreserved: true };
fs.writeFileSync(path.join(__dirname, 'discovery-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
