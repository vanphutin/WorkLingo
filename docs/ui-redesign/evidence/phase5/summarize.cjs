/* Evidence aggregation only; never changes application or historical captures. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const list = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? list(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const records = dir => list(path.join(__dirname, dir)).filter(file => file.endsWith('.json')).map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const css = read('css-before.json').files.map(({ source }) => {
  const text = fs.readFileSync(path.join(root, source), 'utf8');
  return { source, lines: text.split('\n').length, hex: (text.match(/#[\da-f]{3,8}\b/giu) || []).length, functionalColors: (text.match(/\b(?:rgba?|hsla?)\(/giu) || []).length, important: (text.match(/!important/gu) || []).length, transitionAll: (text.match(/transition\s*:\s*all\b/gu) || []).length, backdrop: (text.match(/(?:-webkit-)?backdrop-filter\s*:/gu) || []).length, sourceSHA256: hash(path.join(root, source)) };
});
const outsideTokens = rows => rows.filter(row => !row.source.endsWith('/tokens.css')).reduce((sum, row) => { for (const key of ['hex', 'functionalColors', 'important', 'transitionAll', 'backdrop']) sum[key] = (sum[key] || 0) + row[key]; return sum; }, {});
fs.writeFileSync(path.join(__dirname, 'css-after.json'), JSON.stringify({ revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), scope: 'Same29 CSS file owners as css-before, counts are not defects', outsideTokens: outsideTokens(css), files: css }, null, 2) + '\n');
const audits = records('after').filter(row => row.title?.startsWith('route audit'));
const cells = audits.flatMap(row => row.observations);
const contrast = records('review-fixes').filter(row => row.title?.startsWith('actual glass')).flatMap(row => row.observations);
const contrastKinds = Object.fromEntries(['text-position-composite', 'control-boundary'].map(kind => { const samples = contrast.filter(row => row.kind === kind); return [kind, { count: samples.length, pixelSamples: samples.reduce((sum, row) => sum + (row.samples?.length ?? 0), 0), minimum: Math.min(...samples.map(row => row.ratio)) }]; }));
const regression = records('regression').filter(row => typeof row.title === 'string');
const opaque = regression.flatMap(row => row.observations).filter(row => row.kind === 'opaque-text-contrast');
const keyboard = records('review-fixes').filter(row => row.title?.startsWith('all routes expose')).flatMap(row => row.observations);
const summary = { fixtureOnly: true, routeCount: new Set(cells.map(row => row.route)).size, cells: cells.length, passedMatrices: audits.filter(row => row.status === 'passed').length, overflowCells: cells.filter(row => row.scroll > row.width).length, invalidLandmarks: cells.filter(row => row.mainCount !== 1 || row.nestedMain !== 0).length, invalidPageHeadings: cells.filter(row => row.h1.length !== 1).length, unnamedControls: cells.flatMap(row => row.unnamedControls).length, contrastKinds, cssBefore: outsideTokens(read('css-before.json').files), cssAfter: outsideTokens(css), regression: { total: regression.length, passed: regression.filter(row => row.status === 'passed').length, failures: regression.filter(row => row.status !== 'passed').map(row => row.title) }, performance: { before: read('before-performance/performance.json'), after: read('after/performance.json') }, limitations: ['Loaded route matrix and bounded sampled semantics, not all possible business states or complete WCAG certification.', 'Headless Chromium only; fixture transport, no live backend/provider, screenreader, native zoom, physical notch or GPU SLA certification.'] };
Object.assign(summary, { opaqueText: { count: opaque.length, minimum: Math.min(...opaque.map(row => row.ratio)), limitation: 'Opaque ancestor backgrounds only; does not model group opacity or glass.' }, keyboard: { routes: new Set(keyboard.map(row => row.route)).size, samples: keyboard.length, minimumNativeTabs: Math.min(...keyboard.map(row => row.nativeTabCount)), maximumNativeTabs: Math.max(...keyboard.map(row => row.nativeTabCount)) }, correctedChecks: records('review-fixes').map(row => ({ title: row.title, status: row.status })) });
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
process.stdout.write(JSON.stringify({ ...summary, performance: { before: summary.performance.before.chunkBytes, after: summary.performance.after.chunkBytes } }, null, 2) + '\n');
