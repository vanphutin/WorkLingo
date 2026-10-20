const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { runBounded } = require('./bounded-process.cjs');

test('a rejected evidence namespace preserves its previous manifest byte for byte', () => {
  const fixture = path.join(__dirname, 'matrix-preservationfixture');
  const sentinel = 'immutable fixture evidence\n';
  fs.mkdirSync(fixture);
  const manifest = path.join(fixture, 'result.json');
  fs.writeFileSync(manifest, sentinel, { flag: 'wx' });
  try {
    const result = cp.spawnSync(process.execPath, [path.join(__dirname, 'run-matrix.cjs'), path.basename(fixture)], {
      encoding: 'utf8', timeout: 15_000, windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.equal(fs.readFileSync(manifest, 'utf8'), sentinel);
  } finally {
    fs.unlinkSync(manifest);
    fs.rmdirSync(fixture);
  }
});

test('a bounded child is terminated and awaited when its deadline expires', async () => {
  const result = await runBounded(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 2000)'], {
    timeoutMs: 150, windowsHide: true, stdio: 'ignore',
  });
  assert.equal(result.timedOut, true);
  assert.notEqual(result.exitCode, 0);
});
