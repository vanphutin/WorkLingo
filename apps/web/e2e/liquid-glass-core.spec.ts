import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { themeInitScript } from '../src/lib/theme';

const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase2');
const measurements: object[] = [];
const observations: object[] = [];
let client = '', markup = '';

test.beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  const requireWeb = createRequire(path.resolve(__dirname, '../package.json'));
  const requireVitest = createRequire(requireWeb.resolve('vitest/package.json'));
  const requireVite = createRequire(requireVitest.resolve('vite/package.json'));
  const { build } = requireVite('esbuild');
  const options = { bundle: true, write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' } };
  client = (await build({ ...options, entryPoints: [path.join(__dirname, 'fixtures/liquid-glass-core-client.tsx')], platform: 'browser', format: 'iife' })).outputFiles[0].text;
  const server = await build({ ...options, entryPoints: [path.join(__dirname, 'fixtures/liquid-glass-core-server.tsx')], platform: 'node', format: 'cjs' });
  const file = path.resolve(__dirname, '../../../.superpowers/sdd/02-redesign-plan/core-server.cjs');
  writeFileSync(file, server.outputFiles[0].text);
  markup = requireWeb(file).markup;
});
test.afterAll(() => {
  const mode = process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'development';
  const selection = measurements.length ? 'matrix' : 'smoke';
  writeFileSync(path.join(evidence, `${mode}-${selection}.json`), JSON.stringify({ mode, measurements, observations }, null, 2) + '\n');
});

async function mount(page: Page) {
  const css = ['styles/tokens.css', 'styles/glass.css', 'app/globals.css', 'styles/workspace.css', 'styles/learning.css']
    .map((file) => readFileSync(path.resolve(__dirname, '../src', file), 'utf8')).join('\n');
  const fixtureCss = 'main{max-width:1000px;padding:24px;margin:auto;display:grid;gap:24px}form{display:grid;gap:16px}.fixture-card{padding:24px;background:var(--surface-primary);border:1px solid var(--border);border-radius:var(--radius-panel);min-width:0}.fixture-tools,.fixture-actions{display:flex;align-items:center;flex-wrap:wrap;gap:12px}.fixture-tools{padding:16px}.fixture-statuses{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.fixture-table.admin-shell{display:block;min-height:0}.fixture-table table{width:100%;border-collapse:collapse}.fixture-table td,.fixture-table th{padding:12px;text-align:start}.fixture-table td{border-top:1px solid var(--border)}[data-swatch]{display:block;width:24px;height:24px}';
  await page.route('http://127.0.0.1:33302/**', (route) => route.fulfill({
    contentType: route.request().url().endsWith('.js') ? 'application/javascript' : 'text/html',
    body: route.request().url().endsWith('.js') ? client : `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>${themeInitScript}</script><style>${css}\n${fixtureCss}</style></head><body><div id="root">${markup}</div><script src="/core.js"></script></body></html>`,
  }));
  await page.goto('http://127.0.0.1:33302/');
  await expect(page.getByRole('button', { name: 'Thử đánh giá lại' })).toBeVisible();
}

function contrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; })
    .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const theme of ['light', 'dark'] as const) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`${theme} core native controls and feedback at ${width}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width: width!, height: height! });
    await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
    await mount(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const retry = page.getByRole('button', { name: 'Thử đánh giá lại' });
    await retry.focus();
    await expect(retry).toHaveCSS('outline-width', '3px');
    await expect(page.locator('.teacher-feedback')).toHaveCSS('backdrop-filter', 'none');
    await expect(page.locator('.fixture-card')).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    const selectors = ['.primary-button:not(:disabled)', '.secondary-button', '.secondary-action-button:not(.recording-delete-button)', '.recording-delete-button', '.feedback-error', '.session-paused-banner', '.status-improving', '.status-needs_attention', '.status-steady', '.status-insufficient_evidence', '#core-search', '#core-invalid'];
    for (const selector of selectors) {
      const rgb = await page.locator(selector).first().evaluate((el) => {
        const rgb = (s: string) => s.match(/[\d.]+/g)!.map(Number);
        const style = getComputedStyle(el);
        let parent: Element | null = el;
        let background = style.backgroundColor;
        while ((background === 'rgba(0, 0, 0, 0)' || background === 'transparent') && parent?.parentElement) { parent = parent.parentElement; background = getComputedStyle(parent).backgroundColor; }
        return { fg: rgb(style.color), bg: rgb(background), border: rgb(style.borderTopColor) };
      });
      const ratio = contrast(rgb.fg, rgb.bg);
      expect(ratio, `${theme}/${selector} text`).toBeGreaterThanOrEqual(4.5);
      measurements.push({ theme, width, selector, kind: 'text', ...rgb, ratio });
      if (selector.startsWith('#core')) {
        const borderRatio = contrast(rgb.border, rgb.bg);
        expect(borderRatio, `${theme}/${selector} boundary`).toBeGreaterThanOrEqual(3);
        measurements.push({ theme, width, selector, kind: 'boundary', ratio: borderRatio });
      }
    }
    // Actual screenshot pixel under glass label, including tint and compositing.
    const png = await page.locator('[data-swatch]').screenshot();
    const background = await page.evaluate(async (base64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + base64; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(12, 12, 1, 1).data].slice(0, 3);
    }, png.toString('base64'));
    const foreground = await page.locator('.transparency-control').evaluate((el) => getComputedStyle(el).color.match(/[\d.]+/g)!.map(Number));
    const ratio = contrast(foreground, background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    measurements.push({ theme, width, kind: 'glass-composite', foreground, background, ratio });
    await page.getByRole('button', { name: 'Hoàn tất đánh giá' }).click();
    await expect(page.getByRole('heading', { name: 'Teacher AI đang phân tích' })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('fixture-evaluation-complete')));
    await expect(page.getByRole('heading', { name: 'Thông điệp rõ ràng và đúng mục tiêu giao tiếp trong công việc' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(evidence, `core-${theme}-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
    observations.push({ theme, width, height, errors, overflow: false });
  });
}

test('inline async completion preserves draft focus; retry is busy once and keyboard leaves feedback', async ({ page }) => {
  await mount(page);
  const draft = page.getByRole('textbox', { name: 'Bản nháp câu trả lời' });
  await draft.fill('Bản nháp được giữ nguyên');
  await page.getByRole('button', { name: 'Hoàn tất đánh giá' }).click();
  await expect(page.getByRole('heading', { name: 'Teacher AI đang phân tích' })).toBeVisible();
  await draft.focus();
  await expect(draft).toBeFocused();
  await page.evaluate(() => window.dispatchEvent(new Event('fixture-evaluation-complete')));
  await expect(page.getByRole('heading', { name: 'Thông điệp rõ ràng và đúng mục tiêu giao tiếp trong công việc' })).toBeVisible();
  await expect(draft).toBeFocused();
  await expect(draft).toHaveValue('Bản nháp được giữ nguyên');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Phản hồi từ Teacher AI' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hiện lỗi đánh giá' }).click();
  const retry = page.getByRole('button', { name: 'Thử đánh giá lại' });
  await retry.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Đang thử lại…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Đang thử lại…' })).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Số lần thử lại')).toHaveText('1');
  const deletion = page.getByRole('button', { name: 'Xóa bản ghi âm ngay' });
  await deletion.focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Tiếp tục bài học' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(deletion).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(deletion).toHaveCount(0);
  await expect(draft).toHaveValue('Bản nháp được giữ nguyên');
  observations.push({ inlineFocus: true, retryCalls: 1, deletion: true });
});

test('390px Vietnamese at 200% CSS zoom keeps focused actions and fields inside viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  for (const selector of ['#core-search', '#core-password', '#core-draft', '#core-invalid', '#core-select', '.recording-consent input', '.primary-button:not(:disabled)', '.recording-delete-button', '.theme-control']) {
    const control = page.locator(selector).first();
    await control.focus();
    // Scroll the actual indicator owner, not just the tiny checkbox inside a
    // long label. This verifies visible geometry after scrolling, not automatic
    // focus scrolling or native browser zoom.
    await control.evaluate((node) => (node.closest('.recording-consent') ?? node).scrollIntoView({ block: 'center', inline: 'nearest' }));
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    const focus = await control.evaluate((node) => {
      // Checkbox's visible focus belongs to its labelled group as well as input.
      const el = node.closest('.recording-consent') ?? node;
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      const zoom = Number(getComputedStyle(document.documentElement).zoom);
      const extent = (parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset)) * zoom;
      let clipped = false;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const s = getComputedStyle(parent), box = parent.getBoundingClientRect();
        if (/hidden|clip|auto|scroll/.test(s.overflowX) && (rect.left - extent < box.left || rect.right + extent > box.right)) clipped = true;
        if (/hidden|clip/.test(s.overflowY) && (rect.top - extent < box.top || rect.bottom + extent > box.bottom)) clipped = true;
      }
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { left: rect.left - extent, right: rect.right + extent, top: rect.top - extent, bottom: rect.bottom + extent,
        outline: style.outlineStyle, clipped, occluded: !hit || !(el === hit || el.contains(hit)) };
    });
    expect(focus.outline).toBe('solid');
    expect(focus.left).toBeGreaterThanOrEqual(0);
    expect(focus.right).toBeLessThanOrEqual(390);
    expect(focus.top).toBeGreaterThanOrEqual(0);
    expect(focus.bottom, selector).toBeLessThanOrEqual(844);
    expect(focus.clipped).toBe(false);
    expect(focus.occluded).toBe(false);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidence, 'core-vi-390-zoom200.png'), fullPage: true });
  observations.push({ width: 390, locale: 'vi', cssZoom: 2, focusedBounds: true, outlineBoundsAndAncestors: true });
});

test('adopted recovery, recording, continue and panel buttons retain enabled hover feedback', async ({ page }) => {
  await mount(page);
  for (const name of ['continue-button', 'retry-button', 'recording-stop-button', 'toggle-panel-button']) {
    const control = page.getByRole('button', { name, exact: true });
    await control.hover();
    await expect(control).toHaveCSS('filter', 'brightness(0.93)');
    const disabled = page.getByRole('button', { name: `${name} disabled`, exact: true });
    await disabled.hover();
    await expect(disabled).toHaveCSS('filter', 'none');
  }
  observations.push({ adoptedHover: true, disabledUnchanged: true });
});

test('system theme, reduced material/motion and native field semantics remain usable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mount(page);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 30)');
  await page.getByRole('checkbox', { name: 'Giảm độ trong suốt' }).check();
  await expect(page.locator('.fixture-tools')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.primary-button').first()).toHaveCSS('transition-duration', '0s');
  await expect(page.getByRole('textbox', { name: 'Chỉ đọc' })).toHaveAttribute('readonly', '');
  await expect(page.getByRole('textbox', { name: 'Không khả dụng' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Câu trả lời thứ hai' }).check();
  await expect(page.getByRole('radio', { name: 'Câu trả lời thứ hai' })).toBeChecked();
  await page.getByRole('button', { name: 'Lưu và tiếp tục với câu trả lời hiện tại' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Vui lòng kiểm tra thông tin đã nhập.' })).toBeVisible();
  observations.push({ systemDark: true, reducedTransparency: true, reducedMotion: true, nativeFields: true });
});

for (const theme of ['light', 'dark'] as const) test(`actual login ${theme}: validation retains values, focus and boundaries`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
  await page.goto('http://127.0.0.1:33300/login');
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('kept-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('kept-password');
  await page.getByLabel('Email', { exact: true }).focus();
  await expect(page.getByLabel('Email', { exact: true })).toHaveCSS('outline-width', '3px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidence, `login-${theme}-390.png`), fullPage: true });
  observations.push({ actualLogin: true, theme, validation: true, valuesPreserved: true });
});
