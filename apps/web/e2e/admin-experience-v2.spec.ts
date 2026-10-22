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

for (const [width, height, locale, theme] of [[1440, 900, 'vi', 'light'], [390, 844, 'vi', 'dark'], [1440, 900, 'en', 'dark'], [390, 844, 'en', 'light']] as const) {
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

for (const [owner, url, selector] of [
  ['orientation', '/admin/ielts-orientation', 'input[name=courseTitle]'],
  ['bridge', '/admin/ielts-bridge', '.bridge-editor__module input'],
  ['integrated', '/admin/ielts-integrated', '.bridge-stage-card input'],
  ['band', '/admin/ielts-band-curriculum', '.band-editor input'],
  ['mock', '/admin/ielts-mocks', '.authoring-fields input'],
] as const) test(`dirty ${owner} survives shell, appearance and resize`, async ({ page }) => {
  test.skip(phase === 'before');
  await fixtures(page, owner, 'en'); await page.goto(url);
  const field = page.locator(selector).first(); await expect(field).toBeVisible();
  const original = await field.inputValue();
  const changed = owner === 'integrated' ? String(Number(original) + 1) : `${original} — preserved local draft`;
  await field.fill(changed); await field.evaluate(el => el.setAttribute('data-draft-identity', 'original'));
  let prompts = 0; page.on('dialog', async dialog => { prompts++; await dialog.dismiss(); });
  await page.locator('.ad-breadcrumbs a').first().click();
  await expect(page).toHaveURL(new RegExp(url + '$')); expect(prompts).toBe(1);
  await expect(field).toHaveValue(changed);
  await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.workspace-navigation-toggle').click();
  await page.locator('.workspace-nav-admin').getByRole('button', { name: 'System', exact: true }).click();
  await page.locator('.workspace-nav-admin').getByRole('link', { name: 'Analytics', exact: true }).click();
  expect(prompts).toBe(2); await expect(field).toHaveValue(changed);
  await expect(field).toHaveAttribute('data-draft-identity', 'original');
});

test('new import keeps edits when template or shell navigation is cancelled', async ({ page }) => {
  test.skip(phase === 'before'); await fixtures(page, 'import', 'en'); await page.goto('/admin/content/new');
  const source = page.locator('#raw-source-input'); await source.fill('Keep my new imported lesson');
  let prompts = 0; page.on('dialog', async dialog => { prompts++; await dialog.dismiss(); });
  await page.getByLabel('Lesson template', { exact: true }).selectOption('grammar');
  await expect(source).toHaveValue('Keep my new imported lesson');
  await page.locator('.ad-breadcrumbs a').first().click();
  await expect(page).toHaveURL(/\/admin\/content\/new$/u); expect(prompts).toBe(2);
  await expect(source).toHaveValue('Keep my new imported lesson');
});

test('operations contextual details preserve pagination, focus and mobile access', async ({ page }) => {
  test.skip(phase === 'before'); await fixtures(page, 'operations', 'en'); await page.goto('/admin/operations');
  const inspect = page.getByRole('button', { name: 'Inspect', exact: true }).first(); await inspect.click();
  await expect(page.locator('#job-detail-heading')).toBeFocused();
  await page.screenshot({ path: path.join(evidence, 'operations-detail-1440-en.png') });
  await page.keyboard.press('Escape'); await expect(inspect).toBeFocused();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Inspect', exact: true }).first().click();
  await expect(page.locator('#job-detail-heading')).toBeFocused();
  await page.screenshot({ path: path.join(evidence, 'operations-detail-390-en.png') });
  await page.getByRole('button', { name: 'Close job details' }).click();
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
});

test('system appearance and reduced transparency retain a mounted draft', async ({ page, context }) => {
  test.skip(phase === 'before'); await fixtures(page, 'orientation', 'en');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); await page.goto('/admin/ielts-orientation');
  const title = page.locator('input[name=courseTitle]'); await title.fill('Accessible draft remains mounted');
  await title.evaluate(el => el.setAttribute('data-identity', 'accessible-draft'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'dark' }] });
  await expect(page.locator('.workspace-navigation-admin')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.admin-sidebar-trigger').first()).toHaveCSS('transition-duration', '0s');
  await page.screenshot({ path: path.join(evidence, 'orientation-system-dark-reduced-transparency.png') });
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await expect(title).toHaveValue('Accessible draft remains mounted'); await expect(title).toHaveAttribute('data-identity', 'accessible-draft');
});
