/* Phase 0 only: read source and public pages; never authenticate or submit forms. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});
const source = walk(path.join(root, 'apps/web/src')).sort();
const read = (file) => fs.readFileSync(file, 'utf8');
const routes = source.filter((file) => path.basename(file) === 'page.tsx').map((file) => {
  const sourcePath = relative(file);
  const parts = sourcePath.replace('apps/web/src/app/', '').split('/').slice(0, -1);
  const route = '/' + parts.filter((part) => !part.startsWith('(')).join('/');
  const text = read(file);
  return { route, source: sourcePath, lines: text.split('\n').length,
    imports: [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]),
    layouts: source.filter((candidate) => path.basename(candidate) === 'layout.tsx'
      && file.startsWith(path.dirname(candidate) + path.sep)).map(relative) };
});
const counts = (text, expression) => [...text.matchAll(expression)].length;
const css = source.filter((file) => file.endsWith('.css')).map((file) => {
  const text = read(file);
  return { source: relative(file), lines: text.split('\n').length,
    hexLiterals: counts(text, /#[\da-f]{3,8}\b/gi),
    functionalColors: counts(text, /(?<![-\w])(?:rgba?|hsla?)\(/gi),
    important: counts(text, /!important/g),
    transitionAll: counts(text, /transition:\s*all/g),
    backdrop: counts(text, /(?<!-)backdrop-filter:/g) };
});
const inventory = {
  date: '2026-10-19', timezone: 'Asia/Saigon',
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  routes, layouts: source.filter((file) => path.basename(file) === 'layout.tsx').map(relative), css,
  components: source.filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx')
    && /src\/(components|features)\//.test(relative(file))).map((file) => ({ source: relative(file),
    exports: [...read(file).matchAll(/export\s+(?:function|const|class)\s+(\w+)/g)].map((match) => match[1]) })),
  sourceHashes: Object.fromEntries(source.map((file) => [relative(file),
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])),
};
fs.writeFileSync(path.join(__dirname, 'source-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');

async function capture() {
  const playwright = createRequire(path.join(root, 'apps/web/package.json'))('@playwright/test');
  const browserAvailability = ['chromium', 'firefox', 'webkit'].map((name) => ({
    name, installed: fs.existsSync(playwright[name].executablePath()),
  }));
  const browser = await playwright.chromium.launch({ headless: true });
  const observations = [];
  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: theme, locale: 'vi-VN' });
      await context.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
      const page = await context.newPage();
      for (const [name, route] of [['home', '/'], ['login', '/login'], ['register', '/register']]) {
        for (const [device, width, height] of [['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
          await page.setViewportSize({ width, height });
          const errors = [];
          const onError = () => errors.push('pageerror');
          page.on('pageerror', onError);
          const response = await page.goto('http://127.0.0.1:3000' + route, { waitUntil: 'networkidle' });
          const state = await page.evaluate(() => ({
            overflowPixels: Math.max(0, document.documentElement.scrollWidth - innerWidth),
            h1Count: document.querySelectorAll('h1').length,
            theme: document.documentElement.dataset.theme,
            runningInfiniteAnimations: document.getAnimations().filter((animation) =>
              animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length,
          }));
          const screenshot = `${name}-${theme}-${device}.png`;
          await page.screenshot({ path: path.join(__dirname, screenshot), fullPage: true, animations: 'disabled' });
          observations.push({ route, theme, device, width, height, httpStatus: response?.status(),
            ...state, pageErrorCount: errors.length, screenshot });
          page.off('pageerror', onError);
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
  const result = { date: '2026-10-19', timezone: 'Asia/Saigon', baseURL: 'http://127.0.0.1:3000',
    authentication: 'Fresh guest browser contexts; no form submission or account creation.',
    screenshotPolicy: 'Animations disabled for capture only; running animation count sampled first.',
    browserAvailability, observations };
  fs.writeFileSync(path.join(__dirname, 'public-baseline.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ routes: routes.length, layouts: inventory.layouts.length,
    featureComponents: inventory.components.filter((item) => item.source.includes('/features/')).length,
    sharedComponentFiles: inventory.components.filter((item) => item.source.includes('/components/')).length,
    cssFiles: css.length, screenshots: observations.length,
    overflow: observations.filter((item) => item.overflowPixels > 0), browserAvailability }, null, 2));
}
capture().catch((error) => { console.error(error.message); process.exitCode = 1; });
