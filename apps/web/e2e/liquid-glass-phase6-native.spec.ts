import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { phase6Recorder, phase6Root } from './fixtures/phase6-evidence';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
import { installSettingsFixtures } from './fixtures/phase4-settings-contracts';
import { attemptId } from './fixtures/phase4-exam-contracts';
import { importId } from './fixtures/phase4-authoring-contracts';

declare const chrome: { tabs: {
  query(query: { url: string }): Promise<{ id?: number }[]>;
  setZoomSettings(id: number, settings: { mode: string; scope: string }): Promise<void>;
  setZoom(id: number, factor: number): Promise<void>;
  getZoom(id: number): Promise<number>;
} };
const observations = phase6Recorder();
for (const theme of ['light', 'dark']) for (const windowWidth of [780, 1440]) test(`actual browser zoom200 ${theme} physical window ${windowWidth}`, async () => {
  const extension = path.resolve(__dirname, 'fixtures/phase6-zoom');
  const context = await chromium.launchPersistentContext('', { channel: 'chromium', headless: true, viewport: null, args: [`--window-size=${windowWidth},1000`, `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const page = context.pages()[0] ?? await context.newPage();
    await context.addInitScript(value => { if (location.origin === 'http://127.0.0.1:33300') localStorage.setItem('worklingo:theme:v1', value); }, theme);
    for (const [url, locale] of [['/settings', 'vi'], ['/settings', 'en'], [`/admin/content/${importId}`, 'vi'], [`/ielts/mock-tests/${attemptId}`, 'vi']] as const) {
      const route = auditRoutes.find(item => item[1] === url)!;
      if (url === '/settings') { await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' }); await installSettingsFixtures(page, { kind: 'settings', locale }); }
      else await prepareAuditRoute(page, route);
      await context.addCookies([{ name: 'worklingo_locale', value: locale, domain: '127.0.0.1', path: '/' }]);
      await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(route[2]).first()).toBeVisible();
      const zoom = async (factor: number) => worker.evaluate(async factor => {
        const tab = (await chrome.tabs.query({ url: 'http://127.0.0.1:33300/*' }))[0]!;
        if (tab.id === undefined) throw new Error('No isolated test tab');
        await chrome.tabs.setZoomSettings(tab.id, { mode: 'automatic', scope: 'per-tab' }); await chrome.tabs.setZoom(tab.id, factor);
        return chrome.tabs.getZoom(tab.id);
      }, factor);
      await zoom(1);
      const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
      expect(await zoom(2)).toBe(2);
      await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBeCloseTo(before.dpr * 2, 1);
      const after = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, dpr: devicePixelRatio, CSSZoom: getComputedStyle(document.documentElement).zoom, pinchScale: visualViewport?.scale }));
      expect(after.width).toBeLessThan(before.width * .55); expect(after.scroll).toBeLessThanOrEqual(after.width);
      expect(['1', 'normal']).toContain(after.CSSZoom); expect(after.pinchScale).toBe(1);
      await page.keyboard.press('Tab'); await expect(page.locator(':focus')).toBeVisible();
      const screenshots = path.join(phase6Root, 'native-zoom'); mkdirSync(screenshots, { recursive: true });
      // Playwright fullPage clips to CSS-width under actual browser zoom.
      // Capture the browser's visible device surface directly, without resizing.
      const cdp = await context.newCDPSession(page);
      const capture = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(path.join(screenshots, `${url.split('/')[1]}-${locale}-${theme}-${windowWidth}.png`), Buffer.from(capture.data, 'base64'));
      await cdp.detach();
      observations.push({ url, locale, theme, windowWidth, nativeZoomAPI: 'chrome.tabs.setZoom/getZoom', factor: 2, before, after, extensionProfile: 'temporary, not user profile' });
    }
  } finally { await context.close(); }
});
