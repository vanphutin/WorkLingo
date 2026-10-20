/* Fault injection only into an ignored immutable copy, never into product source. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const ref = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const target = path.join(root, '.superpowers/sdd/02-redesign-plan/phase6-error-snapshot', ref);
const web = path.join(target, 'apps/web');
if (!fs.existsSync(path.join(web, 'package.json'))) {
  fs.mkdirSync(target, { recursive: true });
  const archive = path.join(target, 'source.tar');
  cp.execFileSync('git', ['archive', '--format=tar', '-o', archive, ref, 'apps/web/src', 'apps/web/next.config.ts', 'apps/web/tsconfig.json', 'apps/web/next-env.d.ts', 'apps/web/package.json', 'tsconfig.base.json', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'], { cwd: root });
  cp.execFileSync('tar', ['-xf', archive, '-C', target]);
  fs.symlinkSync(path.join(root, 'apps/web/node_modules'), path.join(web, 'node_modules'), 'junction');
  const leaf = path.join(web, 'src/app/(auth)/login/page.tsx');
  const source = fs.readFileSync(leaf, 'utf8');
  if (!source.includes('const t = useT(') || !source.includes('<main className="auth-page">')) throw new Error('Unknown Login injection owner');
  fs.writeFileSync(leaf, source.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport {useState} from 'react';")
    .replace("  const t = useT('auth', authMessages);", "  const t = useT('auth', authMessages);\n  const [fault,setFault]=useState(false);\n  if(fault)throw new Error('Phase6 isolated diagnostic');")
    .replace('<main className="auth-page">', '<main className="auth-page"><button data-phase6-fault onClick={()=>setFault(true)}>Trigger isolated render failure</button>'));
}
const originalError = fs.readFileSync(path.join(root, 'apps/web/src/app/error.tsx'));
if (!originalError.equals(fs.readFileSync(path.join(web, 'src/app/error.tsx')))) throw new Error('Snapshot error owner differs from product');
const evidence = path.join(root, 'docs/ui-redesign/evidence/phase6/error'); fs.mkdirSync(evidence, { recursive: true });
fs.writeFileSync(path.join(evidence, 'snapshot.json'), JSON.stringify({ sourceCommit: ref, timestamp: new Date().toISOString(), method: 'Immutable git archive, only Login leaf injected in ignored snapshot; actual error owner unchanged', injectedFile: 'apps/web/src/app/(auth)/login/page.tsx', errorOwnerSHA256: crypto.createHash('sha256').update(originalError).digest('hex'), productionSourceModified: false }, null, 2) + '\n');
const next = require.resolve('next/dist/bin/next');
const env = { ...process.env, WORKLINGO_API_URL: 'http://127.0.0.1:9', NEXT_TELEMETRY_DISABLED: '1' };
if (!fs.existsSync(path.join(web, '.next/BUILD_ID'))) cp.execFileSync(process.execPath, [next, 'build', web], { cwd: web, env, stdio: 'inherit', windowsHide: true });
const child = cp.spawn(process.execPath, [next, 'start', web, '-H', '127.0.0.1', '-p', '33301'], { cwd: web, env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { process.exitCode = code ?? 1; }); process.on('SIGTERM', () => child.kill()); process.on('SIGINT', () => child.kill());
