// Original committed frontend only, in an ignored snapshot. Original dirty checkout is never read.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const ref = process.env.WORKLINGO_PHASE6_SNAPSHOT_REF ?? '7a5e383763ccd63c4befa4ab07a5559ba7cabfbe';
if (!/^[0-9a-f]{40}$/u.test(ref) || cp.execFileSync('git', ['rev-parse', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim() !== ref) throw new Error('An exact existing commit SHA is required');
const target = path.join(root, '.superpowers/sdd/02-redesign-plan/phase6-original-snapshot', ref);
const web = path.join(target, 'apps/web');
if (!fs.existsSync(path.join(web, 'package.json'))) {
  fs.mkdirSync(target, { recursive: true });
  const archive = path.join(target, 'source.tar');
  cp.execFileSync('git', ['archive', '--format=tar', '-o', archive, ref, 'apps/web/src', 'apps/web/next.config.ts', 'apps/web/tsconfig.json', 'apps/web/next-env.d.ts', 'apps/web/package.json', 'tsconfig.base.json', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'], { cwd: root });
  cp.execFileSync('tar', ['-xf', archive, '-C', target]);
  fs.symlinkSync(path.join(root, 'apps/web/node_modules'), path.join(web, 'node_modules'), 'junction');
}
const next = require.resolve('next/dist/bin/next');
const env = { ...process.env, WORKLINGO_API_URL: 'http://127.0.0.1:9', NEXT_TELEMETRY_DISABLED: '1' };
if (!fs.existsSync(path.join(web, '.next/BUILD_ID'))) cp.execFileSync(process.execPath, [next, 'build', web], { cwd: web, env, stdio: 'inherit', windowsHide: true });
const child = cp.spawn(process.execPath, [next, 'start', web, '-H', '127.0.0.1', '-p', '33302'], { cwd: web, env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; }); process.on('SIGTERM', () => child.kill()); process.on('SIGINT', () => child.kill());
