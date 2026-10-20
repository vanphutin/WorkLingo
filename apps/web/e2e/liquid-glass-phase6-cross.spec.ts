import { test, expect } from '@playwright/test';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
import { sessionId as learningId } from './fixtures/phase4-session-contracts';
import { attemptId } from './fixtures/phase4-exam-contracts';
import { importId } from './fixtures/phase4-authoring-contracts';
import { phase6Recorder } from './fixtures/phase6-evidence';

const observations = phase6Recorder();
const urls = ['/login', '/dashboard', `/sessions/${learningId}`, `/ielts/mock-tests/${attemptId}`, `/admin/content/${importId}`, '/settings', '/'];
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`representative routes ${theme} ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: width!, height: height! });
    await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
    await page.addInitScript(value => { if (location.origin === 'http://127.0.0.1:33300') localStorage.setItem('worklingo:theme:v1', value); }, theme);
    for (const url of urls) {
      const route = auditRoutes.find(item => item[1] === url)!;
      await prepareAuditRoute(page, route); await page.goto('http://127.0.0.1:33300' + url);
      await expect(page.locator(route[2]).first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.getByRole('main')).toHaveCount(1); await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth, support: CSS.supports('backdrop-filter', 'blur(1px)'), materials: [...document.querySelectorAll('.glass-surface')].map(el => ({ variant: el.getAttribute('data-glass-variant'), filter: getComputedStyle(el).backdropFilter, background: getComputedStyle(el).backgroundColor, nested: !!el.parentElement?.closest('.glass-surface') })) }));
      expect.soft(bounds.scroll, url).toBeLessThanOrEqual(bounds.client);
      await page.keyboard.press('Tab');
      expect.soft(await page.locator(':focus').evaluate(el => parseFloat(getComputedStyle(el).outlineWidth)), url).toBeGreaterThanOrEqual(2);
      observations.push({ url, theme, width, height, ...bounds, errors: [...errors] });
      expect.soft(errors, url).toEqual([]);
    }
  });
}

test('preferences storage failure disclosure and draft controls remain usable', async ({ page, browserName }) => {
  const route = auditRoutes.find(item => item[1] === '/settings')!;
  await prepareAuditRoute(page, route);
  await page.addInitScript(() => { if (location.origin === 'http://127.0.0.1:33300') localStorage.setItem('worklingo:theme:v1', 'system'); });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:33300/settings'); await expect(page.locator('.settings-grid')).toBeVisible();
  const reduced = page.locator('.settings-page .transparency-control input'); await reduced.check();
  await expect(page.locator('.shell-header-surface')).toHaveCSS('backdrop-filter', 'none'); await reduced.uncheck();
  await page.emulateMedia({ contrast: 'more' });
  const contrastMore = await page.evaluate(() => matchMedia('(prefers-contrast: more)').matches);
  observations.push({ diagnostic: 'increased contrast capability', contrastMore, actualFilter: await page.locator('.shell-header-surface').evaluate(el => getComputedStyle(el).backdropFilter) });
  observations.push(await page.evaluate(() => {
    const media: object[] = [];
    const visit = (rules: CSSRuleList) => { for (const rule of [...rules]) { const group = rule as CSSGroupingRule & { conditionText?: string }; if (group.conditionText?.includes('prefers-contrast')) media.push({ condition: group.conditionText, matches: matchMedia(group.conditionText).matches, rule: rule.cssText.slice(0, 1500) }); if (group.cssRules) visit(group.cssRules); } };
    for (const sheet of [...document.styleSheets]) { try { visit(sheet.cssRules); } catch { /* cross-origin sheets are not audited */ } }
    return { diagnostic: 'actual compiled media rules', media };
  }));
  if (browserName === 'firefox') {
    // Standalone color-only control reproduces Firefox155 media-invalidation failure.
    // Keep dynamic transition BLOCKED; verify initial preference after a real reload.
    observations.push({ dynamicIncreasedContrast: 'BLOCKED: Firefox155 emulator does not restyle existing sheets, including plain color-only control', reproduction: 'phase6-firefox-controlled-variants.log', staticPreferenceCheck: 'Reload under already-emulated preference; not a dynamic transition pass' });
    await page.reload(); await expect(page.locator('.settings-grid')).toBeVisible();
  }
  if (contrastMore) await expect(page.locator('.shell-header-surface')).toHaveCSS('backdrop-filter', 'none');
  await page.emulateMedia({ contrast: 'no-preference', forcedColors: 'active' });
  await expect(page.locator('.settings-language-card select')).toBeEnabled();
  const forcedColors = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
  await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  const toggle = page.locator('.workspace-navigation-toggle'); await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.addInitScript(() => { for (const method of ['getItem', 'setItem', 'removeItem']) Object.defineProperty(Storage.prototype, method, { configurable: true, value() { throw new DOMException('Blocked test storage', 'SecurityError'); } }); });
  const auth = auditRoutes.find(item => item[1] === '/login')!; await prepareAuditRoute(page, auth);
  await page.goto('http://127.0.0.1:33300/login'); const email = page.locator('input[type=email]');
  await email.fill('fixture-only@example.test'); await page.locator('.theme-control').click(); await page.setViewportSize({ width: 768, height: 1024 });
  await expect(email).toHaveValue('fixture-only@example.test'); await expect(page.locator('input[type=password]')).toHaveAttribute('type', 'password');
  observations.push({ manualReducedTransparency: true, independentIncreasedContrast: contrastMore ? 'PASS' : 'BLOCKED: engine did not emulate query', forcedColors: forcedColors ? 'PASS: controls usable' : 'NOT APPLICABLE: query not emulated', keyboardDisclosure: true, storageBlockedUsable: true, authDraftRetained: true, realAuthentication: false });
});
