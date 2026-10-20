const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '../../../..');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const canonical = value => value.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gu, '/[id]');
const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, '../source-inventory.json'), 'utf8')).routes;
const owner = walk(path.join(__dirname, 'regression')).filter(file => file.endsWith('.json')).map(file => ({ file: path.relative(__dirname, file).replaceAll('\\', '/'), ...JSON.parse(fs.readFileSync(file, 'utf8')) }));
const routes = inventory.map(item => {
  const key = canonical(item.route.replace(/\[[^\]]+\]/gu, '[id]'));
  const evidence = owner.filter(test => test.observations?.some(obs => typeof obs.url === 'string' && canonical(obs.url) === key)).map(test => test.file);
  return { route: item.route, source: item.source, result: evidence.length ? 'PASS: owner fixture rendering' : 'NOT RUN: no matching owner observation', evidence };
});
const perfFile = 'performance-fixed-final/chromium/repeated-lab-paint-shift-interaction-and-scroll-observations.json';
const perf = read(perfFile).observations;
const percentile = (numbers, fraction) => [...numbers].sort((a, b) => a - b)[Math.ceil(numbers.length * fraction) - 1];
const performance = [...new Set(perf.map(row => row.url))].map(url => {
  const rows = perf.filter(row => row.url === url), frames = rows.flatMap(row => row.frameIntervals);
  return { url, samples: rows.length, lcpMs: rows.map(row => row.lcpMs), cls: rows.map(row => row.CLSObservedSessionWindow), interactionMaxMs: rows.map(row => row.sampledInteractionMaxMs), observedInteractions: rows.map(row => row.observedInteractionCount), frameMedianMs: percentile(frames, .5), frameP95Ms: percentile(frames, .95), frameMaxMs: Math.max(...frames) };
});
const assets = walk(path.join(root, 'apps/web/.next/static')).filter(file => /\.(js|css)$/u.test(file));
const bundle = Object.fromEntries(['js', 'css'].map(extension => {
  const files = assets.filter(file => file.endsWith('.' + extension));
  return [extension, { files: files.length, rawBytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0), gzipBytes: files.reduce((sum, file) => sum + zlib.gzipSync(fs.readFileSync(file)).length, 0) }];
}));
const ratioObservations = owner.flatMap(test => test.observations ?? []).filter(row => row.kind === 'opaque-text-contrast');
const result = { sourceCommit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), timestamp: new Date().toISOString(), command: 'node docs/ui-redesign/evidence/phase6/summarize.cjs', routes, routeTotal: routes.length, routeVerified: routes.filter(row => row.evidence.length).length, ownerTests: owner.length, ownerFailures: owner.filter(test => test.status !== 'passed').map(test => test.title), performance, performanceArtifact: perfFile, staticAssetInventory: bundle, opaqueTextSamples: ratioObservations.length, opaqueTextMinimum: Math.min(...ratioObservations.map(row => row.ratio)), limits: ['Owner105 source18e00fd predates Operations fix; use operations-regression-final for its18 affected cases. Other owners unchanged.', 'Asset sums include all chunks, NOT per-route transferred payload or a before/after regression metric.', 'Lab18 observations on one headless desktop with loopback fixtures, no CPU/network throttling; EventTiming maxima are not field INP; no physical60FPS or total CWV claim.', 'Original CLS baseline is controlled separately in cls-original-baseline; it is not an equivalent full LCP/INP baseline.'] };
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
const lines = ['# Phase6 route and performance evidence', '', `Current summary source ${result.sourceCommit}. Fixture-owner routes ${result.routeVerified}/${routes.length}; historical Phase5 audit is separate.`, '', '| Route | Result | Owner artifacts |', '| --- | --- | --- |', ...routes.map(row => `| \`${row.route}\` | ${row.result} | [${row.evidence.length} observations](${row.evidence[0] ?? 'summary.json'}) |`), '', '## Repeated optimized lab measurements', '', '| Route | LCP ms (3) | CLS (3) | Observed interaction max ms (3) | Frame median / p95 / max ms |', '| --- | --- | --- | --- | --- |', ...performance.map(row => `| ${row.url} | ${row.lcpMs.join(' / ')} | ${row.cls.map(value => value.toFixed(5)).join(' / ')} | ${row.interactionMaxMs.join(' / ')} | ${row.frameMedianMs.toFixed(2)} / ${row.frameP95Ms.toFixed(2)} / ${row.frameMaxMs.toFixed(2)} |`), '', ...result.limits.map(limit => '- ' + limit), ''];
fs.writeFileSync(path.join(__dirname, 'README.md'), lines.join('\n'));
console.log(JSON.stringify({ routes: result.routeVerified, total: routes.length, ownerTests: owner.length, failures: result.ownerFailures.length, opaqueSamples: result.opaqueTextSamples, opaqueMinimum: result.opaqueTextMinimum, performance, bundle }, null, 2));
