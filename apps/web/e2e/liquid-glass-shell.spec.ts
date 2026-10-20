import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { attemptId, questionId, shellAttempt, shellUser } from './fixtures/shell-contracts';

const baseline = process.env.WORKLINGO_SHELL_BASELINE === 'true';
const evidence = path.resolve(__dirname, process.env.WORKLINGO_SHELL_EVIDENCE_DIR ?? '../../../docs/ui-redesign/evidence/phase3');
const observations: object[] = [];

test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.afterAll(() => {
  const mode = baseline ? 'before' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'after';
  const run = process.env.WORKLINGO_SHELL_EVIDENCE_RUN ?? 'diagnostic';
  writeFileSync(path.join(evidence, `${mode}${run === 'matrix' ? '' : '-' + run}-results.json`), JSON.stringify({ mode, observations }, null, 2) + '\n');
});

function contrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; })
    .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

async function materialContrast(page: Page, name: string) {
  for (const surface of await page.locator('.shell-header-surface, .workspace-navigation, .public-nav-surface').all()) {
    const probe = await surface.evaluateHandle((el) => {
      const probe = document.createElement('span'); probe.dataset.materialProbe = 'true'; probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'display:block;width:24px;height:24px;margin:8px;background:transparent;pointer-events:none';
      el.append(probe); return probe;
    });
    const png = await page.locator('[data-material-probe]').screenshot();
    const background = await page.evaluate(async (base64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + base64; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(12, 12, 1, 1).data].slice(0, 3);
    }, png.toString('base64'));
    const text = await surface.evaluate((el) => {
      const target = el.querySelector('.workspace-nav-group-label') ?? el.querySelector('.brand-logo, .public-brand-link') ?? el;
      return getComputedStyle(target).color.match(/[\d.]+/g)!.map(Number);
    });
    const ratio = contrast(text, background);
    expect(ratio, `${name} composite label`).toBeGreaterThanOrEqual(4.5);
    observations.push({ name, kind: 'composite', background, foreground: text, ratio });
    await probe.evaluate((el) => el.remove()); await probe.dispose();
  }
  const select = page.locator('.shell-header-surface select, .public-nav-surface select').first();
  const colors = await select.evaluate((el) => {
    const s = getComputedStyle(el), rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    return { border: rgb(s.borderTopColor), background: rgb(s.backgroundColor), text: rgb(s.color) };
  });
  const boundary = contrast(colors.border, colors.background);
  expect(boundary, `${name} language boundary`).toBeGreaterThanOrEqual(3);
  observations.push({ name, kind: 'boundary', ...colors, ratio: boundary });
}

for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`${theme} shell matrix at ${width}`, async ({ page }) => {
    test.skip(baseline);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await appearance(page, theme);
    for (const kind of ['public', 'learner', 'admin', 'focus']) {
      await page.unrouteAll(); await fixtures(page, kind === 'admin');
      await page.setViewportSize({ width: width!, height: height! });
      const url = kind === 'public' ? '/' : kind === 'admin' ? '/admin/content' : kind === 'focus' ? `/ielts/mock-tests/${attemptId}` : '/settings';
      await page.goto(`http://127.0.0.1:33300${url}`);
      if (kind === 'admin') await expect(page.locator('.content-list-empty')).toBeVisible();
      else if (kind === 'focus') await expect(page.getByRole('textbox')).toHaveValue('My saved answer');
      else await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const title = `${kind}-${theme}-${width}`;
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), title).toBe(true);
      await page.screenshot({ path: path.join(evidence, `after-${title}.png`), fullPage: true });
      if (kind !== 'public') {
        const trigger = page.getByRole('button', { name: kind === 'admin' ? 'Không gian quản trị' : 'Điều hướng học tập', exact: true });
        const nav = page.getByRole('navigation', { name: kind === 'admin' ? 'Không gian quản trị' : 'Điều hướng học tập', exact: true });
        if (width! < 1000 || kind === 'focus') {
          await expect(nav).toBeHidden();
          await trigger.click(); await expect(nav).toBeVisible();
          // Chromium full-page capture transiently resizes this document to 1×1,
          // legitimately firing the breakpoint reset. Preserve the requested
          // viewport when capturing an explicitly open responsive state.
          await page.screenshot({ path: path.join(evidence, `after-open-${title}.png`), fullPage: false, animations: 'disabled' });
        }
        await expect(nav.getByRole('link')).toHaveCount(kind === 'admin' ? 13 : 5);
        if (kind === 'admin') await expect(nav.getByRole('link', { name: 'Nội dung', exact: true })).toHaveAttribute('aria-current', 'page');
        if (kind === 'learner') await expect(nav.getByRole('link', { name: 'Cài đặt', exact: true })).toHaveAttribute('aria-current', 'page');
        if (kind === 'focus') {
          await expect(page.locator('.shell-context')).toHaveText(/Không gian tập trung/);
          await expect(page.locator('.shell-header-surface')).toHaveCSS('backdrop-filter', 'none');
          await expect(page.getByRole('timer')).toBeVisible();
        }
        for (const control of await page.locator('.shell-header-surface button, .shell-header-surface select, .shell-header-surface .brand-logo').all()) {
          expect((await control.boundingBox())!.height, title + ' touch target').toBeGreaterThanOrEqual(44);
        }
      }
      await materialContrast(page, title);
      observations.push({ kind, theme, width, height, overflow: false, errors: [...errors], networkFixture: true, realAuthentication: false });
    }
    expect(errors).toEqual([]);
  });
}

for (const admin of [false, true]) test(`${admin ? 'admin' : 'learner'} mobile disclosure keyboard, outside click, resize and history`, async ({ page }) => {
  test.skip(baseline);
  await appearance(page, 'light'); await fixtures(page, admin);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:33300${admin ? '/admin/content' : '/settings'}`);
  const label = admin ? 'Không gian quản trị' : 'Điều hướng học tập';
  const toggle = page.getByRole('button', { name: label, exact: true });
  const nav = page.getByRole('navigation', { name: label, exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const links = nav.getByRole('link');
  await links.last().focus(); await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused(); await expect(nav).toBeHidden();
  await page.keyboard.press('Space');
  await links.last().focus(); await page.keyboard.press('Tab');
  expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(false);
  await page.locator(admin ? '#admin-main-content' : '#learner-main-content').click({ position: { x: 4, y: 4 } });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click(); await toggle.focus();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(toggle).toBeHidden(); await expect(nav).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeFocused(); await expect(nav).toBeHidden();
  await toggle.click();
  await nav.getByRole('link', { name: admin ? 'Nội dung' : 'Cài đặt', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  // Browser history between real existing destinations; feature data beyond the
  // empty content/settings fixture is not certified by this navigation check.
  await page.goto('http://127.0.0.1:33300/');
  await page.goBack(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.goForward(); await expect(page.locator('.public-nav-surface')).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  observations.push({ admin, disclosure: true, escapeRestoresFocus: true, noTrap: true, resizeRepairsFocus: true, history: true });
});

test('actual mock player retains node, answer, deadline and API payload across shell interactions', async ({ page }) => {
  test.skip(baseline);
  await appearance(page, 'light'); const state = await fixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:33300/ielts/mock-tests/${attemptId}`);
  const answer = page.getByRole('textbox');
  await expect(answer).toHaveValue('My saved answer');
  await answer.evaluate((el) => el.setAttribute('data-shell-state-probe', 'same-node'));
  await page.getByRole('timer').evaluate((el) => el.setAttribute('data-shell-timer-probe', 'same-timer'));
  const getPath = `/api/v1/me/ielts-mocks/attempts/${attemptId}`;
  const initialLoads = state.requests.filter((r) => r.path === getPath && r.method === 'GET').length;
  await answer.fill('Keep this actual player answer');
  await expect.poll(() => state.requests.filter((r) => r.method === 'PUT').length).toBe(1);
  const put = state.requests.find((r) => r.method === 'PUT')!;
  expect(put.body).toEqual({ expectedRevision: 1, responses: { [questionId]: 'Keep this actual player answer' } });
  const toggle = page.getByRole('button', { name: 'Điều hướng học tập', exact: true });
  await toggle.click(); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Giao diện màu:/ }).click();
  await page.getByRole('combobox', { name: 'Ngôn ngữ giao diện' }).selectOption('en');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(answer).toHaveAttribute('data-shell-state-probe', 'same-node');
  await expect(answer).toHaveValue('Keep this actual player answer');
  await expect(page.getByRole('timer')).toHaveAttribute('data-shell-timer-probe', 'same-timer');
  expect(state.requests.filter((r) => r.path === getPath && r.method === 'GET')).toHaveLength(initialLoads);
  expect(state.requests.filter((r) => r.method === 'PUT')).toHaveLength(1);
  expect(state.requests.filter((r) => r.method === 'POST')).toHaveLength(0);
  await page.getByRole('button', { name: 'Save progress', exact: true }).click();
  await expect.poll(() => state.requests.filter((r) => r.method === 'PUT').length).toBe(2);
  expect(state.requests.filter((r) => r.method === 'PUT')[1]!.body).toEqual({ expectedRevision: 2, responses: { [questionId]: 'Keep this actual player answer' } });
  observations.push({ actualPlayer: 'IeltsMockPlayer', fixtureFromExistingUnit: true, initialLoads, sameAnswerNode: true,
    sameTimerNode: true, deadline: state.deadline, requests: state.requests, realAPI: false });
});

test('system theme, reduced material/motion, forced colors and skip link remain usable', async ({ page }) => {
  test.skip(baseline);
  await fixtures(page); await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('http://127.0.0.1:33300/settings');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 30)');
  const skip = page.getByRole('link', { name: 'Đến nội dung học tập' });
  await skip.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#learner-main-content')).toBeFocused();
  await page.getByRole('checkbox', { name: 'Giảm độ trong suốt' }).check();
  for (const material of await page.locator('.shell-header-surface, .workspace-navigation').all()) await expect(material).toHaveCSS('backdrop-filter', 'none');
  await page.getByRole('button', { name: 'Điều hướng học tập', exact: true }).click();
  await expect(page.locator('.workspace-nav')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ contrast: 'more' });
  await expect(page.locator('.workspace-navigation')).toHaveCSS('backdrop-filter', 'none');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.locator('.workspace-navigation')).toHaveCSS('backdrop-filter', 'none');
  observations.push({ systemDark: true, reducedMotion: true, reducedTransparency: true, increasedContrast: true, forcedColors: true, skipLinkFocus: true });
});

for (const admin of [false, true]) test(`${admin ? 'admin' : 'learner'} Vietnamese mobile CSS200% zoom and native keyboard auto-scroll`, async ({ page }) => {
  test.skip(baseline);
  await fixtures(page, admin); await appearance(page, 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:33300${admin ? '/admin/content' : '/settings'}`);
  await expect(page.locator('.workspace-navigation')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const toggle = page.getByRole('button', { name: admin ? 'Không gian quản trị' : 'Điều hướng học tập', exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  // Native Tab scrolling only: no scrollIntoView is used in this scenario.
  const linkCount = admin ? 13 : 5;
  for (let index = 0; index < linkCount; index++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement, r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const z = Number(getComputedStyle(document.documentElement).zoom);
      const extra = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * z;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { name: el.textContent, left: r.left - extra, right: r.right + extra,
        top: r.top, bottom: r.bottom, visible: !!hit && (el === hit || el.contains(hit)) };
    });
    expect(focused.left, focused.name!).toBeGreaterThanOrEqual(0);
    expect(focused.right, focused.name!).toBeLessThanOrEqual(390);
    expect(focused.top, focused.name!).toBeGreaterThanOrEqual(0);
    expect(focused.bottom, focused.name!).toBeLessThanOrEqual(844);
    expect(focused.visible).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(toggle).toBeFocused();
  const box = await toggle.boundingBox(); expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth,
    shell: [...document.querySelectorAll('.shell-header-surface, .workspace-navigation')].map((el) => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })) }));
  for (const surface of overflow.shell) { expect(surface.left).toBeGreaterThanOrEqual(0); expect(surface.right).toBeLessThanOrEqual(390); }
  if (admin) expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport);
  observations.push({ admin, kind: 'CSS200-content-overflow', ...overflow, featureContentOwnedByLaterPhase: !admin });
  await page.screenshot({ path: path.join(evidence, `zoom200-${admin ? 'admin' : 'learner'}-390.png`), fullPage: true });
  observations.push({ admin, width: 390, locale: 'vi', CSSZoom: 2, nativeKeyboardAutoScroll: true, explicitScrolling: false, nativeBrowserZoom: false });
});

async function fixtures(page: Page, admin = false) {
  let attempt = shellAttempt();
  let locale = shellUser.locale;
  const requests: { method: string; path: string; body: unknown }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(), url = new URL(request.url());
    const body = request.postDataJSON();
    requests.push({ method: request.method(), path: url.pathname, body });
    if (url.pathname === '/api/v1/me') return route.fulfill({ json: { ...shellUser, locale, roles: admin ? ['CONTENT_ADMIN'] : ['LEARNER'] } });
    if (url.pathname === '/api/v1/me/preferences') { locale = body.locale; return route.fulfill({ json: { locale } }); }
    if (url.pathname === '/api/v1/admin/content-imports') return route.fulfill({ json: [] });
    if (url.pathname === `/api/v1/me/ielts-mocks/attempts/${attemptId}`) return route.fulfill({ json: attempt });
    if (url.pathname === `/api/v1/me/ielts-mocks/attempts/${attemptId}/responses` && request.method() === 'PUT') {
      attempt = { ...attempt, responses: body.responses, revision: attempt.revision + 1 };
      return route.fulfill({ json: attempt });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'No network fixture for this request' } });
  });
  return { requests, deadline: attempt.sectionDeadlineAt };
}

async function appearance(page: Page, theme: string) {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
}

for (const theme of ['light', 'dark']) test(`representative shell captures ${theme}`, async ({ page }) => {
  test.skip(!baseline, 'Baseline capture only; after matrix is verified by the shell tests.');
  await appearance(page, theme);
  const cases = [
    { name: 'public-desktop', url: '/', width: 1440, height: 900 },
    { name: 'learner-desktop', url: '/settings', width: 1440, height: 900 },
    { name: 'learner-mobile', url: '/settings', width: 390, height: 844 },
    { name: 'admin-desktop', url: '/admin/content', width: 1440, height: 900 },
    { name: 'admin-mobile', url: '/admin/content', width: 390, height: 844 },
    { name: 'focus-mobile', url: `/ielts/mock-tests/${attemptId}`, width: 390, height: 844 },
  ];
  for (const item of cases) {
    await page.unrouteAll();
    await fixtures(page, item.name.startsWith('admin'));
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.goto(`http://127.0.0.1:33300${item.url}`);
    await expect(page.getByRole('heading').first()).toBeVisible();
    if (item.name.startsWith('admin')) await expect(page.locator('.content-list-empty')).toBeVisible();
    if (item.name.startsWith('public')) await expect(page.locator('.landing-hero a[href="/dashboard"]')).toBeVisible();
    if (item.name.startsWith('focus')) await expect(page.getByRole('textbox')).toHaveValue('My saved answer');
    await page.evaluate(() => document.fonts.ready);
    const file = `before-${item.name}-${theme}.png`;
    await page.screenshot({ path: path.join(evidence, file), fullPage: true });
    observations.push({ ...item, theme, file, authenticatedNetworkFixture: item.name !== 'public-desktop' });
  }
});


test('baseline Settings content at Vietnamese mobile CSS200% zoom', async ({ page }) => {
  test.skip(!baseline);
  await fixtures(page); await appearance(page, 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:33300/settings');
  await expect(page.locator('.settings-page')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const bounds = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth,
    contentRight: document.querySelector('.settings-grid')!.getBoundingClientRect().right }));
  observations.push({ baseline: '429a8d0', kind: 'Settings CSS200 overflow', ...bounds });
  await page.screenshot({ path: path.join(evidence, 'before-settings-zoom200.png'), fullPage: true });
});


test('English shell labels reflow and guest public CTAs retain their destinations', async ({ page }) => {
  test.skip(baseline);
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.route('**/api/v1/me', (route) => route.fulfill({ status: 401, json: { message: 'Guest fixture' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:33300/');
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Create free account', exact: true })).toHaveAttribute('href', '/register');
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeVisible();
  for (const admin of [false, true]) {
    await page.unrouteAll(); await fixtures(page, admin);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://127.0.0.1:33300${admin ? '/admin/content' : '/settings'}`);
      const language = page.locator('.shell-header-surface select');
      await expect(language).toBeVisible(); await language.selectOption('en');
      const label = admin ? 'Admin workspace' : 'Learning navigation';
      if (width < 1000) await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByRole('navigation', { name: label, exact: true }).getByRole('link')).toHaveCount(admin ? 13 : 5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  observations.push({ locale: 'en', widths: [390, 1440], learnerLinks: 5, adminLinks: 13, publicGuestCTAs: ['/login', '/register'] });
});
