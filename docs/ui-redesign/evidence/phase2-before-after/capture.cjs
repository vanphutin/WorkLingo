/* Reproducible screenshots, not a product route or image-generation mockup. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { createRequire } = require('node:module');
const out = __dirname;
const repo = path.resolve(out, '../../../..');
const scratch = path.join(repo, '.superpowers/sdd/02-redesign-plan/visual-evidence');
const before = '8ad9ba8759c604521d87a6c9f9103b2a917d94bc';
const after = '2395da17dc634a55ef6fa7a9e3388b6c9f420b75';
const web = path.join(repo, 'apps/web');
const requireWeb = createRequire(path.join(web, 'package.json'));
const { chromium, expect } = requireWeb('@playwright/test');
const requireVitest = createRequire(requireWeb.resolve('vitest/package.json'));
const requireVite = createRequire(requireVitest.resolve('vite/package.json'));
const { build } = requireVite('esbuild');
const next = requireWeb.resolve('next/dist/bin/next');
const servers = [];
const observations = [];

function snapshot() {
  const dest = path.join(scratch, 'before');
  if (!fs.existsSync(path.join(dest, 'apps/web/package.json'))) {
    fs.mkdirSync(dest, { recursive: true });
    const archive = path.join(scratch, 'before.tar');
    cp.execFileSync('git', ['archive', '--format=tar', '-o', archive, before,
      'apps/web/src', 'apps/web/next.config.ts', 'apps/web/tsconfig.json',
      'apps/web/next-env.d.ts', 'apps/web/package.json', 'tsconfig.base.json',
      'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'], { cwd: repo });
    cp.execFileSync('tar', ['-xf', archive, '-C', dest]);
    fs.symlinkSync(path.join(web, 'node_modules'), path.join(dest, 'apps/web/node_modules'), 'junction');
  }
  return path.join(dest, 'apps/web');
}

async function start(source, port, development) {
  const log = fs.openSync(path.join(scratch, `next-${port}.log`), 'w');
  const child = cp.spawn(process.execPath, [next, development ? 'dev' : 'start', source,
    ...(development ? ['--webpack'] : []), '-H', '127.0.0.1', '-p', String(port)], {
    cwd: source, windowsHide: true, stdio: ['ignore', log, log],
    env: { ...process.env, WORKLINGO_API_URL: 'http://127.0.0.1:9', NEXT_TELEMETRY_DISABLED: '1' },
  });
  servers.push(child);
  const url = `http://127.0.0.1:${port}`;
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`Server ${port} exited: ${fs.readFileSync(path.join(scratch, `next-${port}.log`), 'utf8').slice(-3000)}`);
    try { const response = await fetch(url + '/login'); if (response.ok) return url; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server ${port} not ready; inspect scratch log`);
}

const baseEvaluation = {
  attemptId: '00000000-0000-4000-8000-000000000001', status: 'evaluated', transcript: 'Status update',
  score: .82, scores: { taskCompletion: .9, meaningAndLogic: .8, targetLanguage: .75, clarity: .85, pronunciationOrFluency: null },
  feedback: { summary: 'Thông điệp rõ ràng và đúng mục tiêu giao tiếp trong công việc', strengths: ['Nêu đúng hành động cần làm'], improvements: ['Thêm thời hạn cụ thể'], correctedExample: 'Could you send the report by 3 p.m.?' },
  retryable: false, recording: { id: '00000000-0000-4000-8000-000000000002', retentionUntil: '2026-10-25T08:00:00.000Z', deletedAt: null },
  completedAt: '2026-10-20T08:00:00.000Z',
};

async function feedbackHtml(source, version, state) {
  const evaluation = state === 'result' ? baseEvaluation : { ...baseEvaluation, status: 'evaluation_failed', feedback: null, score: null, scores: null, completedAt: null, retryable: true };
  const props = { evaluation, ...(state === 'retry' ? { error: 'Không thể đánh giá. Vui lòng thử lại.', deletionError: 'Chưa thể xóa bản ghi âm. Vui lòng thử lại.' } : {}) };
  const contents = `import {createElement as h} from 'react'; import {renderToString} from 'react-dom/server';
    import {EvaluationFeedback} from ${JSON.stringify(path.join(source, 'src/features/learning-session/evaluation-feedback.tsx'))};
    import {LocaleProvider} from ${JSON.stringify(path.join(source, 'src/i18n/provider.tsx'))};
    export const markup=renderToString(h(LocaleProvider,{initialLocale:'vi'},h(EvaluationFeedback,{...${JSON.stringify(props)},onRetry:()=>{},onDeleteRecording:()=>{}})));`;
  const result = await build({ stdin: { contents, resolveDir: web, loader: 'js' }, bundle: true, write: false,
    platform: 'node', format: 'cjs', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } });
  const bundle = path.join(scratch, `${version}-${state}.cjs`);
  fs.writeFileSync(bundle, result.outputFiles[0].text);
  const markup = require(bundle).markup;
  const css = ['styles/tokens.css', 'styles/glass.css', 'app/globals.css', 'styles/workspace.css', 'styles/learning.css']
    .map((f) => fs.readFileSync(path.join(source, 'src', f), 'utf8')).join('\n');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nmain{padding:20px;max-width:430px;margin:auto}</style></head><body><main>${markup}</main></body></html>`;
}

async function pair(browser, name, theme, files, method) {
  const page = await browser.newPage({ viewport: { width: 840, height: 1 }, deviceScaleFactor: 1 });
  const images = files.map((file, i) => `<article><h2>${i === 0 ? 'TRƯỚC PHASE 2 · 8ad9ba8' : 'SAU PHASE 2 · 2395da1'}</h2><img src="data:image/png;base64,${fs.readFileSync(path.join(out, file)).toString('base64')}" alt="${i === 0 ? 'Trước' : 'Sau'}"></article>`).join('');
  await page.setContent(`<html lang="vi"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#eceef3;color:#1c1c1e;font:14px system-ui}h1{font-size:20px;margin:0 0 8px}p{margin:0 0 16px;color:#48484a}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{min-width:0}h2{font-size:12px;letter-spacing:.04em;margin:0 0 12px}img{display:block;max-width:100%;height:auto;box-shadow:0 2px 12px #0001}</style><h1>${name} · ${theme}</h1><p>${method} · vi · Chromium · cùng nội dung và viewport</p><div class="grid">${images}</div></html>`);
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
  const comparison = `compare-${name}-${theme}.png`;
  await page.screenshot({ path: path.join(out, comparison), fullPage: true });
  observations.push({ name, theme, before, after, method, files, comparison });
  await page.close();
}

(async () => {
  const sourceCheck = cp.spawnSync('git', ['diff', '--quiet', after, '--', 'apps/web/src', 'apps/web/next.config.ts', 'apps/web/package.json', 'packages/contracts', 'packages/content-format'], { cwd: repo, windowsHide: true });
  if (sourceCheck.status !== 0) throw new Error('Product sources differ from the labelled after commit; capture that version explicitly.');
  fs.mkdirSync(scratch, { recursive: true });
  const baseline = snapshot();
  const urls = [await start(baseline, 33310, true), await start(web, 33311, false)];
  const browser = await chromium.launch();
  try {
    for (const theme of ['light', 'dark']) {
      const authFiles = [];
      for (const [index, version] of ['before', 'after'].entries()) {
        const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        await context.addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
        await context.addInitScript((theme) => localStorage.setItem('worklingo:theme:v1', theme), theme);
        const page = await context.newPage();
        await page.goto(urls[index] + '/login');
        await page.locator('input[name="email"]').fill('email-chua-hop-le');
        await page.locator('input[name="password"]').fill('fixture-only-password');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-invalid', 'true');
        await page.locator('input[name="email"]').focus();
        await page.mouse.move(2, 2);
        await page.evaluate(() => document.fonts.ready);
        const file = `auth-form-${theme}-${version}.png`;
        await page.locator('.auth-panel').screenshot({ path: path.join(out, file), animations: 'disabled' });
        authFiles.push(file);
        await context.close();
      }
      await pair(browser, 'auth-form', theme, authFiles, 'AuthForm: route /login thật, validation + focus, viewport 768×1024');
      for (const state of ['result', 'retry']) {
        const files = [];
        for (const [index, version] of ['before', 'after'].entries()) {
          const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
          await page.setContent(await feedbackHtml(index === 0 ? baseline : web, version, state));
          await page.locator('html').evaluate((el, theme) => { el.dataset.theme = theme; }, theme);
          await page.evaluate(() => document.fonts.ready);
          const file = `feedback-${state}-${theme}-${version}.png`;
          await page.locator('.teacher-feedback').screenshot({ path: path.join(out, file), animations: 'disabled' });
          files.push(file);
          await page.close();
        }
        await pair(browser, `feedback-${state}`, theme, files, 'EvaluationFeedback thật: render cô lập với cùng props fixture, viewport 390×844');
      }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ before, after, observations, productCodeChanged: false, originalDirtySourceCopied: false }, null, 2) + '\n');
  console.log(`Captured ${observations.length} comparisons and ${observations.length * 2} original component screenshots.`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const child of servers) if (child.exitCode === null) cp.spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
});
