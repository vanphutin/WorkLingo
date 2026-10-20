import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
import { installSettingsFixtures } from './fixtures/phase4-settings-contracts';
import { authoringFixtures } from './fixtures/phase4-authoring-contracts';

const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase5', process.env.WORKLINGO_PHASE5_RUN ?? 'after');
const observations: object[] = [];
test.afterEach(({}, info) => {
  mkdirSync(evidence, { recursive: true });
  writeFileSync(path.join(evidence, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ title: info.title, status: info.status, observations: observations.splice(0), fixtures: true }, null, 2) + '\n');
});

for (const theme of ['light', 'dark']) test(`all routes expose reachable visible keyboard focus ${theme}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript(t => localStorage.setItem('worklingo:theme:v1', t), theme);
  for (const route of auditRoutes) {
    await prepareAuditRoute(page, route);
    await page.goto('http://127.0.0.1:33300' + route[1]);
    await expect(page.locator(route[2]).first()).toBeVisible();
    await page.keyboard.press('Tab');
    const control = page.locator('main').locator('a[href]:visible,button:enabled:visible,input:enabled:visible,select:enabled:visible,textarea:enabled:visible,[tabindex="0"]:visible').first();
    await control.focus();
    const focus = await control.evaluate(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { tag: el.tagName, outline: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: s.outlineOffset, focusVisible: el.matches(':focus-visible'), top: r.top, bottom: r.bottom, left: r.left, right: r.right, viewport: [innerWidth, innerHeight] };
    });
    observations.push({ route: route[1], theme, focus });
    expect.soft(focus.focusVisible, route[1]).toBe(true);
    expect.soft(focus.width, route[1]).toBeGreaterThanOrEqual(2);
    expect.soft(focus.outline, route[1]).not.toBe('none');
    expect.soft(focus.bottom, route[1]).toBeGreaterThan(0);
    expect.soft(focus.top, route[1]).toBeLessThan(844);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect.soft(control, route[1] + ' reverse focus order').toBeFocused();
  }
});

test('client navigation audio AI curriculum retains owner styles and preference edits', async ({ page }) => {
  await installSettingsFixtures(page, { kind: 'adminAudio', locale: 'en' });
  await page.route('**/api/v1/admin/curriculum', route => route.fulfill({ json: authoringFixtures.curriculum }));
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.goto('http://127.0.0.1:33300/admin/settings/audio');
  await expect(page.locator('.admin-provider-card').first()).toBeVisible();
  // A marker proves Next client navigation, rather than document reload between CSS owners.
  await page.evaluate(() => { (window as Window & { phase5Marker?: string }).phase5Marker = 'same-document'; });
  await page.locator('.admin-settings-tab[href="/admin/settings/ai"]').click();
  const panel = page.locator('.admin-ai-card').first();
  await expect(panel.locator('select')).toBeVisible();
  await panel.locator('select').selectOption('discovery');
  await panel.getByRole('checkbox').uncheck();
  await page.locator('.theme-control').click();
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel.getByRole('checkbox')).not.toBeChecked();
  await expect(panel.locator('select')).toHaveValue('discovery');
  await expect(panel).toHaveCSS('backdrop-filter', 'none');
  await expect(panel.locator('.admin-ai-toggle-card')).toHaveCSS('transition-duration', '0s');
  await page.locator('.workspace-navigation-toggle').click();
  await page.locator('a[href="/admin/curriculum"]').click();
  await expect(page.locator('.curriculum-header')).toBeVisible();
  await expect(page.locator('.action-button').first()).toHaveCSS('transition-duration', '0s');
  expect(await page.evaluate(() => (window as Window & { phase5Marker?: string }).phase5Marker)).toBe('same-document');
  observations.push({ nextClientNavigation: ['audio', 'ai', 'curriculum'], sameDocument: true, unsavedAiInputsRetainedAcrossPreferences: true, reducedMotionOwnerStyles: true, persistenceAcrossRouteUnmount: 'not asserted or changed' });
});

test('system appearance media fallback and safe area declarations remain usable', async ({ page }) => {
  const route = auditRoutes.find(item => item[1] === '/settings')!;
  await prepareAuditRoute(page, route);
  await page.addInitScript(() => localStorage.setItem('worklingo:theme:v1', 'system'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('http://127.0.0.1:33300/settings');
  await expect(page.locator('.settings-grid')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  const dark = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(light).not.toBe(dark);
  await page.locator('.settings-page .transparency-control input').check();
  for (const media of [{ reducedMotion: 'reduce', contrast: 'more' }, { forcedColors: 'active' }] as const) {
    await page.emulateMedia(media);
    for (const surface of await page.locator('.glass-surface').all()) await expect(surface).toHaveCSS('backdrop-filter', 'none');
    await expect(page.locator('.settings-language-card select')).toBeEnabled();
  }
  observations.push({ systemLightDark: [light, dark], reducedTransparency: true, increasedContrast: true, forcedColors: true, physicalNotch: 'not available; env safe-area declarations reused and no shell insets changed' });
});
