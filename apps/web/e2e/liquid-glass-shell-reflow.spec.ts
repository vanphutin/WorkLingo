import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { shellUser } from './fixtures/shell-contracts';

const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase3-remediation');
const ref = process.env.WORKLINGO_REFLOW_REF;
const mode = ref === '429a8d0' ? 'baseline' : ref === '02d27b0' ? 'phase3-before-fix' : 'candidate';
const capture = mode === 'candidate' && process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'candidate-production' : mode;
const rows: object[] = [];
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.afterAll(() => writeFileSync(path.join(evidence, `${capture}.json`), JSON.stringify({ mode,
  runtime: process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'optimized production' : 'webpack development', rows }, null, 2) + '\n'));

async function settings(page: Page) {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript(() => localStorage.setItem('worklingo:theme:v1', 'light'));
  await page.route('**/api/v1/me', (route) => route.fulfill({ json: shellUser }));
  await page.goto('http://127.0.0.1:33300/settings');
  await expect(page.locator('.settings-card').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const selectors = ['.learner-shell', '.learner-content', '.settings-page', '.settings-header', '.settings-grid', '.settings-card', '.appearance-preferences',
      '.settings-card .language-control', '.settings-card select', '.shell-header-surface', '.workspace-navigation'];
    const boxes = selectors.map((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return { selector, absent: true };
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { selector, left: r.left, right: r.right, width: r.width, scrollWidth: el.scrollWidth,
        paddingLeft: s.paddingLeft, paddingRight: s.paddingRight, paddingBottom: s.paddingBottom, widthCSS: s.width, minWidth: s.minWidth,
        columns: s.gridTemplateColumns, gap: s.gap, overflowX: s.overflowX, boxSizing: s.boxSizing };
    });
    return { viewport: innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      zoom: getComputedStyle(document.documentElement).zoom, devicePixelRatio, locale: document.documentElement.lang,
      font: getComputedStyle(document.body).fontFamily, boxes };
  });
}

test('Settings retains baseline horizontal reach without cumulative shell padding', async ({ page }) => {
  await settings(page);
  for (const width of [390, 320, 360, 768]) for (const zoom of [1, 2]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate((value) => { document.documentElement.style.zoom = String(value); }, zoom);
    const result = await measure(page);
    rows.push({ width, ...result });
    if (!ref) {
      const previous = JSON.parse(readFileSync(path.join(evidence, 'baseline.json'), 'utf8')).rows
        .find((row: { width: number; zoom: number | string }) => row.width === width && Number(row.zoom) === zoom);
      // Captures use identical real Settings source, locale, font, viewport and runtime.
      expect(result.font).toBe(previous.font); expect(result.locale).toBe(previous.locale);
      expect(result.devicePixelRatio).toBe(previous.devicePixelRatio); expect(result.clientWidth).toBe(previous.clientWidth);
      expect(result.scrollWidth, `${width}px / CSS${zoom * 100}% vs baseline`).toBeLessThanOrEqual(previous.scrollWidth);
    }
    if (width === 390 && zoom === 2) {
      await page.screenshot({ path: path.join(evidence, `${capture}-390-css200.png`), fullPage: true });
      // One-variable counterfactuals identify constraints without changing source.
      if (ref === '02d27b0') {
        for (const [name, css] of [
          ['remove-shell-inline-insets', '.application-shell { padding-inline: 0; }'],
          ['remove-inner-inline-padding', '.learner-content > main { padding-inline: 0; }'],
          ['allow-feature-grid-shrink-diagnostic-only', '.settings-page { grid-template-columns: minmax(0, 1fr); }'],
        ]) {
          const style = await page.addStyleTag({ content: css });
          rows.push({ experiment: name, ...(await measure(page)) });
          await style.evaluate((el) => el.remove());
        }
      }
    }
  }
});

test('narrow long-label navigation keeps native Tab focus visible at CSS200%', async ({ page }) => {
  test.skip(!!ref, 'Current responsive navigation only');
  await settings(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const toggle = page.getByRole('button', { name: 'Điều hướng học tập', exact: true });
    await toggle.focus(); await page.keyboard.press('Enter');
    const nav = page.getByRole('navigation', { name: 'Điều hướng học tập', exact: true });
    await expect(nav.getByRole('link')).toHaveCount(5);
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press('Tab');
      const box = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement, r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), s = getComputedStyle(el);
        const outline = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * 2;
        return { left: r.left - outline, right: r.right + outline, top: r.top, bottom: r.bottom, hit: !!hit && el.contains(hit) };
      });
      expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width);
      expect(box.top).toBeGreaterThanOrEqual(0); expect(box.bottom).toBeLessThanOrEqual(844); expect(box.hit).toBe(true);
    }
    await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
    rows.push({ kind: 'native-Tab', width, zoom: 2, links: 5, noExplicitScrolling: true });
  }
});

test('shell safe-area insets apply once to feature content', async ({ page }) => {
  test.skip(!!ref, 'Current safe-area contract only');
  await page.setViewportSize({ width: 390, height: 844 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 24, right: 20, bottom: 28 } });
  await settings(page);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const result = await measure(page);
  rows.push({ kind: 'emulated-safe-area', leftCSS: 24, rightCSS: 20, bottomCSS: 28, ...result });
  const grid = result.boxes.find((box) => box.selector === '.settings-grid')!;
  // Layout inset should not be repeated inside the feature; the feature's
  // unchanged intrinsic content width remains a separately recorded issue.
  expect(grid.left).toBe(48);
  expect(result.boxes.find((box) => box.selector === '.learner-shell')!.paddingBottom).toBe('28px');
  for (const selector of ['.shell-header-surface', '.workspace-navigation']) {
    const box = result.boxes.find((item) => item.selector === selector)!;
    expect(box.left).toBe(48); expect(box.right).toBe(350);
  }
  await cdp.detach();
});
