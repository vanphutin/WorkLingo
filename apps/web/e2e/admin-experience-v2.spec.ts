import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installSidebarAdminFixtures, sidebarImportId } from './fixtures/admin-sidebar-contracts';
import { installAuthoringFixtures } from './fixtures/phase4-authoring-contracts';
import { installSettingsFixtures } from './fixtures/phase4-settings-contracts';

const phase = process.env.WORKLINGO_ADMIN_UX_PHASE === 'before' ? 'before' : 'after';
const evidence = path.resolve(__dirname, '../../../docs/admin-ux/evidence', phase);
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
const routes = [
  ['dashboard', '/admin'], ['intermediate', '/admin/programs/intermediate'], ['ielts', '/admin/programs/ielts'],
  ['content', '/admin/content'], ['editor', `/admin/content/${sidebarImportId}`], ['import', '/admin/content/new'],
  ['curriculum', '/admin/curriculum'], ['orientation', '/admin/ielts-orientation'], ['bridge', '/admin/ielts-bridge'],
  ['integrated', '/admin/ielts-integrated'], ['mock', '/admin/ielts-mocks'], ['band', '/admin/ielts-band-curriculum'],
  ['topics', '/admin/ielts-topics'], ['operations', '/admin/operations'], ['audit', '/admin/audit'],
  ['analytics', '/admin/analytics'], ['adminAudio', '/admin/settings/audio'], ['adminAi', '/admin/settings/ai'],
] as const;

async function fixtures(page: Page, owner: string, locale: 'vi' | 'en') {
  await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' });
  if (['operations', 'audit', 'analytics', 'adminAudio', 'adminAi'].includes(owner)) {
    await installSettingsFixtures(page, { kind: owner as 'operations' | 'audit' | 'analytics' | 'adminAudio' | 'adminAi', locale });
  } else {
    await installSidebarAdminFixtures(page, locale);
    if (['content', 'editor', 'import', 'curriculum', 'orientation', 'bridge', 'integrated', 'mock', 'band'].includes(owner)) {
      await installAuthoringFixtures(page, { kind: ['editor', 'import'].includes(owner) ? 'content' : owner as 'content' | 'curriculum' | 'orientation' | 'bridge' | 'integrated' | 'mock' | 'band', locale });
    }
  }
}

for (const [width, height, locale, theme] of [[1440, 900, 'vi', 'light'], [390, 844, 'vi', 'dark']] as const) {
  test(`all admin owners ${width} ${locale} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.context().addCookies([{ name: 'worklingo_locale', value: locale, domain: '127.0.0.1', path: '/' }]);
    await page.addInitScript(theme => { if (location.origin === 'http://127.0.0.1:33320') localStorage.setItem('worklingo:theme:v1', theme); }, theme);
    const observations: object[] = [];
    for (const [owner, url] of routes) {
      await fixtures(page, owner, locale); await page.goto(url);
      await expect(page.locator('#admin-main-content h1').first(), url).toBeVisible();
      await expect(page.locator('#admin-main-content [role=status]').filter({ hasText: /^(Đang tải|Loading)/u })).toHaveCount(0);
      const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        main: document.querySelector('#admin-main-content')!.getBoundingClientRect().toJSON(),
        headings: [...document.querySelectorAll('#admin-main-content h1')].map(node => node.textContent),
        alerts: [...document.querySelectorAll('#admin-main-content [role=alert]')].map(node => node.textContent) }));
      if (phase === 'after') expect.soft(metrics.scroll, url).toBeLessThanOrEqual(width);
      observations.push({ owner, url, ...metrics });
      await page.screenshot({ path: path.join(evidence, `${owner}-${width}-${locale}-${theme}.png`) });
    }
    writeFileSync(path.join(evidence, `owners-${width}-${locale}-${theme}.json`), JSON.stringify(observations, null, 2) + '\n');
  });
}

test('responsive owner geometry, motion, transparency and zoom audit', async ({ page }) => {
  const measurements: object[] = [];
  for (const [width, height] of [[320, 740], [768, 1024], [1280, 800], [1920, 1080]]) {
    await page.setViewportSize({ width: width!, height: height! });
    for (const [owner, url] of routes.filter(([owner]) => ['dashboard', 'editor', 'curriculum', 'operations'].includes(owner))) {
      await fixtures(page, owner, 'en'); await page.goto(url); await expect(page.locator('#admin-main-content h1').first()).toBeVisible();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      if (phase === 'after') expect.soft(dimensions.scroll, `${owner}/${width}`).toBeLessThanOrEqual(width!);
      measurements.push({ owner, width, height, ...dimensions });
      await page.screenshot({ path: path.join(evidence, `${owner}-${width}-en.png`) });
    }
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await fixtures(page, 'intermediate', 'en'); await page.goto('/admin/programs/intermediate/grammar/new');
  await expect(page.getByLabel('Lesson title', { exact: true })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const zoom = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  measurements.push({ owner: 'intermediate-editor', zoom: 2, ...zoom });
  if (phase === 'after') expect.soft(zoom.scroll, 'intermediate-editor/320/CSS200').toBeLessThanOrEqual(320);
  await page.screenshot({ path: path.join(evidence, 'intermediate-320-en-zoom200.png') });
  writeFileSync(path.join(evidence, 'responsive.json'), JSON.stringify(measurements, null, 2) + '\n');
});
