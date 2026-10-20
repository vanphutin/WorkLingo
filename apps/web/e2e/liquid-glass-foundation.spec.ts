import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { themeInitScript } from '../src/lib/theme';

const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase1');
const colors: object[] = [];
const observations: object[] = [];
let clientCode = '';
let serverMarkup = '';

test.beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  // Use the existing Vite toolchain's esbuild; no new application/test dependency.
  const webRequire = createRequire(path.resolve(__dirname, '../package.json'));
  const vitestRequire = createRequire(webRequire.resolve('vitest/package.json'));
  const viteRequire = createRequire(vitestRequire.resolve('vite/package.json'));
  const { build } = viteRequire('esbuild');
  const result = await build({ entryPoints: [path.join(__dirname, 'fixtures/liquid-glass-client.tsx')],
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' } });
  clientCode = result.outputFiles[0].text;
  // Compile SSR with the React toolchain, not Playwright's synthetic JSX transform.
  const server = await build({ entryPoints: [path.join(__dirname, 'fixtures/liquid-glass-server.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' } });
  const serverPath = path.resolve(__dirname, '../../../.superpowers/sdd/02-redesign-plan/foundation-server.cjs');
  writeFileSync(serverPath, server.outputFiles[0].text);
  serverMarkup = webRequire(serverPath).markup;
});

test.afterAll(() => {
  const production = process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true';
  const filename = production ? 'production-browser-results.json' : colors.length ? 'browser-results.json' : 'browser-smoke-results.json';
  writeFileSync(path.join(evidence, filename), JSON.stringify({ mode: production ? 'production' : 'development', colors, observations }, null, 2) + '\n');
});

async function mount(page: Page, unsupported = false) {
  let css = ['styles/tokens.css', 'styles/glass.css', 'app/globals.css', 'styles/workspace.css', 'styles/learning.css']
    .map((file) => readFileSync(path.resolve(__dirname, '../src', file), 'utf8')).join('\n');
  if (unsupported) {
    const condition = '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))';
    expect(css).toContain(condition);
    css = css.replace(condition, '@supports (worklingo-unsupported-material: yes)');
  }
  const fixtureCss = 'main{max-width:1200px;padding:20px;margin:auto}textarea{display:block;max-width:100%;width:32rem;min-height:6rem}.fixture-content{background:var(--surface-primary);padding:16px;margin-block:16px}.fixture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:16px}.fixture-backdrop{padding:24px}.fixture-backdrop .glass-surface{padding:16px;min-height:120px}[data-swatch]{display:block;width:24px;height:24px;margin-top:16px}.transparency-control{margin-block:16px}';
  const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<script>${themeInitScript}</script><style>${css}\n${fixtureCss}</style></head><body><div id="root">`
    + serverMarkup + '</div><script src="/fixture.js"></script></body></html>';
  await page.route('http://127.0.0.1:33301/**', (route) => route.fulfill({
    contentType: route.request().url().endsWith('fixture.js') ? 'application/javascript' : 'text/html',
    body: route.request().url().endsWith('fixture.js') ? clientCode : html,
  }));
  await page.goto('http://127.0.0.1:33301/');
  await expect(page.getByRole('checkbox')).toBeVisible();
}

function contrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map((n) => {
    const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, c, index) => sum + c * [.2126, .7152, .0722][index]!, 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const theme of ['light', 'dark'] as const) {
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    test(`${theme} foundation reflows and keeps rendered glass readable at ${width}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewportSize({ width: width!, height: height! });
      await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
      await mount(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const expectedFill = theme === 'light' ? 'rgb(0, 102, 204)' : 'rgb(0, 145, 255)';
      await expect(page.getByRole('button', { name: 'Continue learning' })).toHaveCSS('background-color', expectedFill);
      await expect(page.getByTestId('regular-white')).toHaveCSS('backdrop-filter', 'blur(20px) saturate(1.8)');
      await expect(page.getByTestId('clear-white')).toHaveCSS('backdrop-filter', 'blur(6px) saturate(1.8)');
      await expect(page.getByTestId('tinted-white')).toHaveCSS('backdrop-filter', 'blur(28px) saturate(1.8)');
      await expect(page.getByTestId('solid-white')).toHaveCSS('backdrop-filter', 'none');
      await expect(page.getByTestId('nested')).toHaveCSS('backdrop-filter', 'none');
      for (const variant of ['regular', 'clear', 'tinted', 'solid']) for (const backdrop of ['black', 'white']) {
        const surface = page.getByTestId(`${variant}-${backdrop}`);
        // Sample an actual composited screenshot pixel, including the tint/highlight/blur layers.
        const png = await surface.locator('[data-swatch]').screenshot();
        const background = await page.evaluate(async (base64) => {
          const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
          return [...context.getImageData(12, 12, 1, 1).data].slice(0, 3);
        }, png.toString('base64'));
        const foreground = await surface.locator('[data-foreground]').evaluate((element) => getComputedStyle(element).color.match(/[\d.]+/g)!.map(Number));
        const ratio = contrast(foreground, background);
        expect(ratio, `${theme}/${variant}/${backdrop} composite`).toBeGreaterThanOrEqual(4.5);
        colors.push({ theme, width, variant, backdrop, foreground, background, ratio });
      }
      await page.screenshot({ path: path.join(evidence, `foundation-${theme}-${width}.png`), fullPage: true });
      observations.push({ theme, width, height, overflow: false, errors });
      expect(errors).toEqual([]);
    });
  }
}

test('keyboard preference persists across reload and another tab without losing a draft', async ({ page, context }) => {
  await mount(page);
  const checkbox = page.getByRole('checkbox', { name: 'Reduce transparency' });
  await page.getByRole('textbox', { name: 'Draft answer' }).fill('A new answer stays here');
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toHaveCSS('outline-style', 'solid');
  await expect(page.getByTestId('regular-black')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.getByRole('textbox')).toHaveValue('A new answer stays here');
  await page.getByRole('button', { name: /color theme: system/i }).click();
  await page.getByRole('button', { name: /color theme: light/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('textbox')).toHaveValue('A new answer stays here');
  const other = await context.newPage();
  await mount(other);
  await expect(other.getByRole('checkbox')).toBeChecked();
  await other.getByRole('checkbox').uncheck();
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole('textbox')).toHaveValue('A new answer stays here');
  await other.getByRole('checkbox').check();
  await other.reload();
  await expect(other.getByRole('checkbox')).toBeChecked();
  await other.evaluate(() => localStorage.clear());
  await expect(checkbox).not.toBeChecked();
  await other.close();
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} semantic text, action, status and focus colors meet contrast thresholds`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
    await mount(page);
    const pairs: [string, string, number][] = [];
    for (const foreground of ['text-primary', 'text-secondary', 'text-muted', 'text-placeholder', 'color-primary', 'color-accent']) {
      for (const background of ['surface-primary', 'surface-secondary', 'surface-tertiary', 'surface-elevated']) pairs.push([foreground, background, 4.5]);
    }
    for (const status of ['primary', 'success', 'warning', 'danger', 'info']) {
      pairs.push([`color-on-${status}`, `color-${status}-fill`, 4.5]);
      pairs.push([`color-${status}`, `color-${status}-subtle`, 4.5]);
    }
    for (const background of ['surface-primary', 'surface-secondary', 'surface-elevated']) {
      pairs.push(['border-strong', background, 3], ['focus-ring', background, 3]);
    }
    for (const [foreground, background, minimum] of pairs) {
      const rgb = await page.evaluate(([a, b]) => {
        const probe = document.createElement('span'); document.body.append(probe);
        const get = (token: string) => { probe.style.color = `var(--${token})`; return getComputedStyle(probe).color.match(/[\d.]+/g)!.map(Number); };
        const result = [get(a!), get(b!)]; probe.remove(); return result;
      }, [foreground, background]);
      const ratio = contrast(rgb[0]!, rgb[1]!);
      colors.push({ theme, foreground, background, ratio, minimum });
      expect(ratio, `${theme} ${foreground}/${background}`).toBeGreaterThanOrEqual(minimum);
    }
  });
}

test('blocked storage and 200% CSS zoom retain usable controls and answers', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Blocked'); };
    Storage.prototype.removeItem = () => { throw new Error('Blocked'); };
  });
  await mount(page);
  await page.getByRole('textbox').fill('Keep this draft');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /color theme: system/i }).click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.getByRole('textbox')).toHaveValue('Keep this draft');
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole('checkbox')).toBeVisible();
});

test('system dark equals manual dark and remains readable with JavaScript disabled', async ({ page, browser }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await mount(page);
  const tokenSnapshot = () => page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(Array.from(style).filter((name) => name.startsWith('--')).map((name) => [name, style.getPropertyValue(name).trim()]));
  });
  const system = await tokenSnapshot();
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  expect(await tokenSnapshot()).toEqual(system);
  const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark' });
  const noScript = await context.newPage();
  await mount(noScript);
  await expect(noScript.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(245, 245, 247)');
  await expect(noScript.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 30)');
  await context.close();
});

test('solid fallback covers unsupported blur and operating-system accessibility modes', async ({ page, context }) => {
  await mount(page, true);
  await expect(page.getByTestId('regular-black')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.getByTestId('regular-black')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const supported = await context.newPage();
  await mount(supported);
  await supported.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
  await expect(supported.getByTestId('clear-white')).toHaveCSS('backdrop-filter', 'none');
  expect(await supported.locator('html').evaluate((element) => getComputedStyle(element).getPropertyValue('--duration-micro').trim())).toBe('0ms');
  await supported.emulateMedia({ contrast: 'no-preference', forcedColors: 'active' });
  await expect(supported.getByTestId('regular-white')).toHaveCSS('backdrop-filter', 'none');
  await supported.emulateMedia({ forcedColors: 'none' });
  const cdp = await context.newCDPSession(supported);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  expect(await supported.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
  await expect(supported.getByTestId('regular-black')).toHaveCSS('backdrop-filter', 'none');
  await cdp.detach();
  await supported.close();
});

test('the opacity token changes regular material without fading its text or solid fallback', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => document.documentElement.style.setProperty('--glass-opacity', '.7'));
  await expect(page.getByTestId('regular-black')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.7)');
  await expect(page.getByTestId('regular-black')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('solid-black')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});

test('actual settings route integrates preferences with its existing guard and links', async ({ page, context }) => {
  // Network fixture for the UI guard only, never a real login or account mutation.
  await page.route('**/api/v1/me', (route) => route.fulfill({ json: {
    id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.test', displayName: 'Fixture learner',
    roles: ['LEARNER'], onboardingStatus: 'COMPLETE', locale: 'en',
  } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.goto('http://127.0.0.1:33300/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /choose playback source/i })).toHaveAttribute('href', '/settings/audio');
  const reduced = page.getByRole('checkbox', { name: 'Reduce transparency' });
  await reduced.check();
  await page.reload();
  await expect(reduced).toBeChecked();
  const outsideSettings = await context.newPage();
  await outsideSettings.goto('http://127.0.0.1:33300/login');
  await expect(outsideSettings.getByRole('checkbox')).toHaveCount(0);
  await expect(outsideSettings.locator('html')).toHaveAttribute('data-reduce-transparency', 'true');
  await reduced.uncheck();
  await expect(outsideSettings.locator('html')).not.toHaveAttribute('data-reduce-transparency');
  await reduced.check();
  await expect(outsideSettings.locator('html')).toHaveAttribute('data-reduce-transparency', 'true');
  await outsideSettings.close();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidence, 'settings-390.png'), fullPage: true });
  observations.push({ route: '/settings', width: 390, preferenceReload: true, syncOutsideSettings: true, authNetworkFixture: true });
});

for (const theme of ['light', 'dark'] as const) {
  test(`actual auth route uses the ${theme} palette and readable native controls`, async ({ page, context }) => {
    await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
    await context.addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:33300/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const email = page.getByLabel('Email', { exact: true });
    await email.fill('fixture@example.test');
    // Auth's existing CSS module intentionally uses the grouped-background token for fields.
    await expect(email).toHaveCSS('background-color', theme === 'light' ? 'rgb(242, 242, 247)' : 'rgb(28, 28, 30)');
    await expect(email).toHaveCSS('color', theme === 'light' ? 'rgb(28, 28, 30)' : 'rgb(245, 245, 247)');
    await page.keyboard.press('Tab');
    await expect(email).toHaveValue('fixture@example.test');
    const rgb = await email.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.color, style.backgroundColor, style.borderTopColor].map((color) => color.match(/[\d.]+/g)!.map(Number));
    });
    expect(contrast(rgb[0]!, rgb[1]!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb[2]!, rgb[1]!)).toBeGreaterThanOrEqual(3);
    observations.push({ route: '/login', theme, width: 390, textContrast: contrast(rgb[0]!, rgb[1]!), borderContrast: contrast(rgb[2]!, rgb[1]!) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(evidence, `auth-${theme}-390.png`), fullPage: true });
  });
}
