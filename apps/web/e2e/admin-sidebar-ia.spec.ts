import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
import { installSidebarAdminFixtures, installSidebarLearnerFixtures, openSidebar, sidebarImportId, sidebarUser } from './fixtures/admin-sidebar-contracts';

const evidence = path.resolve(__dirname, '../../../docs/admin-sidebar-ia/evidence');
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
const existingHrefs = ['/admin', '/admin/programs/intermediate', '/admin/programs/ielts',
  '/admin/programs/intermediate/topic-groups', '/admin/programs/intermediate/topics',
  ...['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'].map(c => `/admin/programs/intermediate/${c}`),
  ...['orientation', 'bridge', 'integrated', 'mocks', 'topics', 'band-curriculum'].map(c => `/admin/ielts-${c}`),
  '/admin/content', '/admin/curriculum', '/admin/analytics', '/admin/audit', '/admin/operations', '/admin/settings/audio', '/admin/settings/ai', '/dashboard'];

async function checkAdmin(page: Page, url: string) {
  const nav = await openSidebar(page);
  url = new URL(page.url()).pathname;
  const hrefs = await nav.locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  expect(hrefs).toHaveLength(27); expect(new Set(hrefs).size).toBe(27);
  for (const href of existingHrefs) expect(hrefs).toContain(href);
  const active = [...existingHrefs, '/admin/content/new'].filter(href => url === href || url.startsWith(href + '/')).sort((a, b) => b.length - a.length)[0];
  await expect(nav.locator('[aria-current=page]')).toHaveCount(active ? 1 : 0);
  if (active) { await expect(nav.locator('[aria-current=page]')).toHaveAttribute('href', active); await expect(nav.locator('[aria-current=page]')).toBeVisible(); }
  expect(await nav.locator('button[aria-expanded=true]').count()).toBeLessThanOrEqual(1);
}

async function appearance(page: Page, width: number, locale: 'vi' | 'en', theme: 'light' | 'dark' | 'system') {
  await page.setViewportSize({ width, height: width < 1000 ? 844 : 900 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: locale, domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript(theme => {
    if (location.origin === 'http://127.0.0.1:33300') localStorage.setItem('worklingo:theme:v1', theme);
  }, theme);
}

for (const [width, locale, theme] of [[1440, 'en', 'light'], [390, 'vi', 'dark']] as const) {
  test(`34 historical routes plus 14 added templates ${width} ${locale} ${theme}`, async ({ page }) => {
    await appearance(page, width, locale, theme);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const observed = new Set<string>();
    const coverage: { requested: string; final: string; cohort: string }[] = [];
    for (const route of auditRoutes) {
      await prepareAuditRoute(page, route);
      if (route[0] !== 'public') await sidebarUser(page, locale, [route[1].startsWith('/admin') ? 'CONTENT_ADMIN' : 'LEARNER']);
      await page.goto(route[1]);
      await expect(page.locator(route[2]).first(), route[1]).toBeVisible();
      if (route[1].startsWith('/admin')) await checkAdmin(page, route[1]);
      observed.add(route[1].replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/u, '/[id]'));
      coverage.push({ requested: route[1], final: new URL(page.url()).pathname, cohort: 'Liquid Glass 34' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (route[1].startsWith('/admin')) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route[1]).toBe(true);
    }
    const additions = JSON.parse(readFileSync(path.resolve(__dirname, '../../../docs/admin-sidebar-ia/routes.json'), 'utf8')) as { route: string; cohort: string }[];
    expect(additions).toHaveLength(48); expect(additions.filter(r => r.cohort === 'Additional 14')).toHaveLength(14);
    for (const row of additions.filter(r => r.cohort === 'Additional 14')) {
      const pathname = row.route.replace('[slug]', 'intermediate').replace('[category]', 'grammar').replace('[importId]', sidebarImportId);
      const url = pathname.endsWith('/topics/new') ? `${pathname}?topicGroupId=${sidebarImportId}` : pathname;
      await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' });
      if (url.startsWith('/admin')) await installSidebarAdminFixtures(page, locale, url); else await installSidebarLearnerFixtures(page, locale);
      await page.goto(url); await expect(page.locator('h1').first(), url).toBeVisible();
      await expect(page.locator('main [role=alert]'), url).toHaveCount(0);
      if (url.startsWith('/admin')) await checkAdmin(page, url);
      observed.add(row.route);
      coverage.push({ requested: row.route, final: new URL(page.url()).pathname, cohort: 'Additional 14' });
    }
    // Instantiate every category destination hidden by the dynamic route template.
    for (const category of ['pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing']) {
      const url = `/admin/programs/intermediate/${category}`;
      await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' });
      await installSidebarAdminFixtures(page, locale, url); await page.goto(url); await checkAdmin(page, url);
    }
    await page.goto('/admin/programs/ielts'); await checkAdmin(page, '/admin/programs/ielts');
    expect(observed.size).toBe(48); expect(errors).toEqual([]);
    writeFileSync(path.join(evidence, `routes-${width}-${locale}.json`), JSON.stringify({ width, locale, theme, coverage, errors }, null, 2) + '\n');
  });
}

for (const width of [390, 1440]) for (const locale of ['en', 'vi'] as const) for (const theme of ['light', 'dark'] as const) {
  test(`sidebar visual ${width} ${locale} ${theme}`, async ({ page }) => {
    await appearance(page, width, locale, theme); await installSidebarAdminFixtures(page, locale);
    await page.goto('/admin/programs/intermediate'); await checkAdmin(page, '/admin/programs/intermediate');
    const nav = page.locator('.workspace-nav-admin');
    if (width >= 1000) { const bounds = await page.locator('.workspace-navigation-admin').boundingBox(); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900); }
    const active = nav.locator('[aria-current=page]'); await active.focus();
    await expect(active).toHaveCSS('outline-width', '3px');
    for (const button of await nav.locator('button:visible').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: path.join(evidence, `sidebar-${width}-${locale}-${theme}.png`) });
    const system = nav.getByRole('button', { name: locale === 'en' ? 'System' : 'Hệ thống', exact: true });
    await system.click(); const last = nav.locator('a[href="/dashboard"]'); await last.focus();
    const bounds = await last.boundingBox(); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(width < 1000 ? 844 : 900);
    await expect(last).toHaveCSS('outline-width', '3px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('native keyboard, disclosure focus, draft retention and system/reduced-motion at 320px and zoom', async ({ page }) => {
  await appearance(page, 390, 'en', 'system'); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await installSidebarAdminFixtures(page, 'en'); await page.goto('/admin/programs/intermediate/grammar/new');
  const draft = page.getByLabel('Lesson title', { exact: true }); await draft.fill('Keep unsaved sidebar draft');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface-secondary').trim())).toBe('#1c1c1e');
  await page.emulateMedia({ colorScheme: 'light' }); await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface-secondary').trim())).toBe('#f2f2f7');
  const toggle = page.locator('.workspace-navigation-toggle'); await toggle.focus(); await page.keyboard.press('Enter');
  const nav = page.locator('.workspace-nav-admin');
  const programs = nav.getByRole('button', { name: 'Training programs', exact: true });
  await nav.getByRole('link', { name: 'Reading', exact: true }).focus(); await page.keyboard.press('Escape');
  await expect(programs).toBeFocused(); await expect(programs).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space'); await expect(programs).toHaveAttribute('aria-expanded', 'true');
  const ielts = nav.getByRole('button', { name: 'IELTS', exact: true }); await ielts.focus(); await page.keyboard.press('Enter');
  await expect(nav.getByRole('link', { name: 'IELTS orientation' })).toBeVisible();
  await expect(draft).toHaveValue('Keep unsaved sidebar draft');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab'); expect(await page.locator('.workspace-navigation').evaluate(node => node.contains(document.activeElement))).toBe(false);
  await page.setViewportSize({ width: 320, height: 740 }); await openSidebar(page);
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await nav.getByRole('button', { name: 'System', exact: true }).click();
  await nav.locator('a[href="/dashboard"]').focus();
  await page.screenshot({ path: path.join(evidence, 'sidebar-320-zoom200-reduced.png') });
  // Navigation fits even at 160 effective CSS pixels. The existing editor's
  // Pronunciation / IPA label has a separate 5px page overflow at this extreme.
  const navBounds = await nav.boundingBox();
  expect(navBounds!.x).toBeGreaterThanOrEqual(0);
  expect(navBounds!.x + navBounds!.width).toBeLessThanOrEqual(320);
  await expect(draft).toHaveValue('Keep unsaved sidebar draft');
  await expect(programs).toHaveCSS('transition-duration', '0s');
  await page.screenshot({ path: path.join(evidence, 'sidebar-320-zoom200-reduced.png') });
});

test('deep link reload, query and browser back/forward restore the owning group', async ({ page }) => {
  await installSidebarAdminFixtures(page); await page.goto('/admin/ielts-topics'); await checkAdmin(page, '/admin/ielts-topics');
  const nav = page.locator('.workspace-nav-admin');
  await nav.getByRole('button', { name: 'Shared management', exact: true }).click();
  await nav.locator('a[href="/admin/content"]').click(); await expect(page).toHaveURL(/\/admin\/content$/u);
  await checkAdmin(page, '/admin/content'); await page.goBack(); await checkAdmin(page, '/admin/ielts-topics');
  await page.goForward(); await checkAdmin(page, '/admin/content');
  await page.goto('/admin/content/new?source=sidebar'); await page.reload(); await checkAdmin(page, '/admin/content/new');
});

test('breakpoint focus skips hidden active links in collapsed groups and other programs', async ({ page }) => {
  await installSidebarAdminFixtures(page);
  for (const [url, state] of [['/admin/content', 'collapsed'], ['/admin/programs/intermediate/grammar', 'other-program']]) {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(url!);
    const nav = await openSidebar(page);
    if (state === 'collapsed') await nav.getByRole('button', { name: 'Shared management', exact: true }).click();
    else await nav.getByRole('button', { name: 'IELTS', exact: true }).click();
    await page.locator('.workspace-navigation-toggle').focus();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(nav.getByRole('link', { name: 'Overview', exact: true })).toBeFocused();
    await expect(nav.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  }
});

test('anonymous and learner roles cannot render admin navigation; both admin roles retain destinations', async ({ page }) => {
  await page.route('**/api/v1/me', route => route.fulfill({ status: 401, json: { message: 'Unauthorized fixture' } }));
  await page.goto('/admin'); await expect(page).toHaveURL(/\/login$/u); await expect(page.locator('.workspace-nav-admin')).toHaveCount(0);
  await page.unrouteAll({ behavior: 'wait' }); await installSidebarLearnerFixtures(page, 'en');
  await page.goto('/admin'); await expect(page).toHaveURL(/\/dashboard$/u); await expect(page.locator('.workspace-nav-admin')).toHaveCount(0);
  for (const role of ['CONTENT_ADMIN', 'SYSTEM_ADMIN']) {
    await page.unrouteAll({ behavior: 'wait' }); await installSidebarAdminFixtures(page); await sidebarUser(page, 'en', [role]);
    await page.goto('/admin'); await checkAdmin(page, '/admin');
  }
});
