// Read-only committed snapshots: never checkout/reset/copy the dirty original.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..');
const ref = process.env.WORKLINGO_REFLOW_REF;
if (!['429a8d0', '02d27b0'].includes(ref)) throw new Error('Only the two measured committed references are supported');
const scratch = path.join(repo, '.superpowers/sdd/02-redesign-plan/phase3-remediation');
const dest = path.join(scratch, ref);
const web = path.join(dest, 'apps/web');
if (!fs.existsSync(path.join(web, 'package.json'))) {
  fs.mkdirSync(dest, { recursive: true });
  const archive = path.join(scratch, `${ref}.tar`);
  cp.execFileSync('git', ['archive', '--format=tar', '-o', archive, ref,
    'apps/web/src', 'apps/web/next.config.ts', 'apps/web/tsconfig.json',
    'apps/web/next-env.d.ts', 'apps/web/package.json', 'tsconfig.base.json',
    'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'], { cwd: repo });
  cp.execFileSync('tar', ['-xf', archive, '-C', dest]);
  fs.symlinkSync(path.join(repo, 'apps/web/node_modules'), path.join(web, 'node_modules'), 'junction');
}
const next = require.resolve('next/dist/bin/next');
const child = cp.spawn(process.execPath, [next, 'dev', web, '--webpack', '-H', '127.0.0.1', '-p', '33300'], {
  cwd: web, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WORKLINGO_API_URL: 'http://127.0.0.1:9' },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => child.kill());
