// Immutable frontend snapshot; never checkout or touch the original dirty worktree.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..');
const ref = '2d9ba797f92daf2583210c66ab2141769dcfd95b';
const dest = path.join(repo, '.superpowers/sdd/02-redesign-plan/phase4-baseline', ref);
const web = path.join(dest, 'apps/web');
if (!fs.existsSync(path.join(web, 'package.json'))) {
  fs.mkdirSync(dest, { recursive: true });
  const archive = path.join(dest, 'source.tar');
  cp.execFileSync('git', ['archive', '--format=tar', '-o', archive, ref,
    'apps/web/src', 'apps/web/next.config.ts', 'apps/web/tsconfig.json', 'apps/web/next-env.d.ts',
    'apps/web/package.json', 'tsconfig.base.json', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'], { cwd: repo });
  cp.execFileSync('tar', ['-xf', archive, '-C', dest]);
  fs.symlinkSync(path.join(repo, 'apps/web/node_modules'), path.join(web, 'node_modules'), 'junction');
}
const next = require.resolve('next/dist/bin/next');
const production = process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true';
if (production && !fs.existsSync(path.join(web, '.next/BUILD_ID'))) cp.execFileSync(process.execPath, [next, 'build', web], { cwd: web, stdio: 'inherit', windowsHide: true });
const child = cp.spawn(process.execPath, [next, production ? 'start' : 'dev', web, ...production ? [] : ['--webpack'], '-H', '127.0.0.1', '-p', '33300'], {
  cwd: web, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WORKLINGO_API_URL: 'http://127.0.0.1:9' },
});
child.on('exit', (code) => { process.exitCode = code ?? 1; });
process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => child.kill());
