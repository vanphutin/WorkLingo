import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { shellUser } from './fixtures/shell-contracts';

const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'before-production' : 'before' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'after';
const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase4/slice-1');
const observations: object[] = [];
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
test.afterEach(({}, info) => {
  const directory = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`);
  mkdirSync(directory, { recursive: true });
  const name = info.title.replace(/[^a-z0-9]+/giu, '-');
  writeFileSync(path.join(directory, `${name}.json`), JSON.stringify({ mode, title: info.title, status: info.status, baseline: '2d9ba79', fixtures: true, observations: observations.splice(0) }, null, 2) + '\n');
});

async function setup(page: Page, theme = 'light', locale = 'vi', signedIn = false) {
  await page.context().addCookies([{ name: 'worklingo_locale', value: locale, domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
  await page.route('**/api/v1/me', (route) => signedIn ? route.fulfill({ json: { ...shellUser, locale } }) : route.fulfill({ status: 401, json: { message: 'Guest fixture' } }));
}

for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`public/auth matrix ${theme} ${width}`, async ({ page }) => {
    await setup(page, theme); await page.setViewportSize({ width: width!, height: height! });
    const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
    for (const url of ['/', '/login', '/register', '/phase4-missing-page']) {
      await page.goto('http://127.0.0.1:33300' + url);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      if (url === '/') await expect(page.locator('.landing-actions a')).toHaveCount(2);
      if (url === '/login' || url === '/register') {
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.locator('form')).not.toHaveAttribute('aria-busy', 'true');
      }
      const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
      if (!baseline) expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
      if (!baseline) await assertTextContrast(page, `${url}/${theme}/${width}`);
      const file = `${mode}-${url === '/' ? 'home' : url.slice(1)}-${theme}-${width}.png`;
      await page.screenshot({ path: path.join(evidence, file), fullPage: true, animations: 'disabled' });
      observations.push({ url, theme, width, height, file, ...bounds });
    }
    expect(errors).toEqual([]);
  });
}

test('narrow Vietnamese public/auth reflow and visible keyboard focus at CSS200', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red');
  await setup(page);
  for (const width of [320, 360, 390]) for (const url of ['/', '/login', '/register', '/phase4-missing-page']) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('http://127.0.0.1:33300' + url);
    if (url === '/') await expect(page.locator('.landing-actions a')).toHaveCount(2);
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
    observations.push({ url, width, CSSZoom: 2, ...bounds });
    expect(bounds.scroll, `${url} ${width}`).toBeLessThanOrEqual(bounds.client);
    const expected = await page.locator('main a[href], main button:not(:disabled), main input:not(:disabled), main select:not(:disabled)').evaluateAll((elements) => elements.map((el, i) => { (el as HTMLElement).dataset.phase4Focus = String(i); return String(i); }));
    const reached = new Set<string>();
    // Diagnostic mutation proves that a removed indicator is rejected, not only bounds.
    if (process.env.WORKLINGO_PHASE4_FOCUS_MUTATION === 'true') await page.addStyleTag({ content: 'main *:focus { outline: none !important; }' });
    // Native keyboard scrolling, no manual centering; outline must remain visible.
    for (let i = 0; i < expected.length + 2; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el === document.body || el.tagName === 'NEXTJS-PORTAL') return null;
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        const outlineWidth = parseFloat(s.outlineWidth) || 0;
        const outline = (outlineWidth + (parseFloat(s.outlineOffset) || 0)) * 2;
        return { id: el.dataset.phase4Focus, left: r.left - outline, right: r.right + outline, top: r.top - outline, bottom: r.bottom + outline, outlineWidth, outlineStyle: s.outlineStyle, name: el.textContent, visible: r.width > 0 && r.height > 0 };
      });
      if (focused) {
        if (focused.id) reached.add(focused.id);
        expect(focused.visible, JSON.stringify(focused)).toBe(true);
        expect(focused.outlineWidth, JSON.stringify(focused)).toBeGreaterThanOrEqual(2);
        expect(focused.outlineStyle).not.toBe('none');
        expect(focused.left, focused.name!).toBeGreaterThanOrEqual(-1);
        expect(focused.right, focused.name!).toBeLessThanOrEqual(width + 1);
        expect(focused.top, JSON.stringify(focused)).toBeGreaterThanOrEqual(-1);
        expect(focused.bottom, JSON.stringify(focused)).toBeLessThanOrEqual(845);
      }
    }
    expect([...reached].sort(), `${url} ${width}: expected native focus targets`).toEqual(expected.sort());
    observations.push({ url, width, CSSZoom: 2, reached: [...reached], expected, nativeTab: true, indicator: 'outline>=2px, full viewport bounds' });
  }
});

async function assertTextContrast(page: Page, name: string) {
  const samples = await page.locator('main h1, main h2, main p:not(.visually-hidden), form label, form input, .landing-actions a, form button').evaluateAll((elements) => elements.map((el) => {
    const style = getComputedStyle(el);
    const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
    let ancestor: Element | null = el;
    let background = rgb(style.backgroundColor);
    while ((background[3] ?? 1) === 0 && ancestor?.parentElement) { ancestor = ancestor.parentElement; background = rgb(getComputedStyle(ancestor).backgroundColor); }
    return { text: el.textContent?.slice(0, 60), foreground: rgb(style.color), background };
  }));
  const luminance = (rgb: number[]) => rgb.slice(0, 3).map((n) => { const c = n / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
  for (const sample of samples) {
    const a = luminance(sample.foreground), b = luminance(sample.background);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    expect(ratio, name + ': ' + sample.text).toBeGreaterThanOrEqual(4.5);
    observations.push({ name, kind: 'opaque-text-contrast', ...sample, ratio });
  }
}

test('auth fields and validation survive appearance/locale; server errors and pending state remain operable', async ({ page }) => {
  test.skip(baseline); await setup(page, 'light', 'en');
  for (const url of ['/login', '/register']) {
    let finish!: () => void;
    await page.route('**/api/v1/auth/*', async (route) => {
      await new Promise<void>((resolve) => { finish = resolve; });
      await route.fulfill({ status: url === '/login' ? 401 : 409, json: { message: 'Fixture rejection' } });
    });
    await page.goto('http://127.0.0.1:33300' + url);
    const email = page.getByLabel('Email'); await email.fill('learner@example.test');
    await page.locator('form button[type=submit]').click();
    await expect(page.locator('[aria-invalid=true]').first()).toBeFocused();
    await page.locator('.theme-control').click();
    await page.getByRole('combobox').selectOption('vi');
    await expect(email).toHaveValue('learner@example.test');
    if (url === '/register') await page.locator('[name=displayName]').fill('Minh Anh');
    await page.locator('[name=password]').fill('correct-horse-battery');
    await page.locator('form button[type=submit]').click();
    await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('form button[type=submit]')).toBeDisabled();
    finish(); await expect(page.locator('[role=alert]').first()).toBeVisible();
    await expect(page.locator('form')).toHaveAttribute('aria-busy', 'false');
    await expect(email).toHaveValue('learner@example.test');
    await page.screenshot({ path: path.join(evidence, `${mode}-${url.slice(1)}-error.png`), fullPage: true });
    await page.unroute('**/api/v1/auth/*');
  }
});

test('public authenticated CTA and appearance fallbacks retain real destinations', async ({ page }) => {
  test.skip(baseline); await setup(page, 'system', 'en', true);
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce', contrast: 'more' });
  await page.goto('http://127.0.0.1:33300/');
  await expect(page.locator('.landing-actions a')).toHaveAttribute('href', '/dashboard');
  await page.evaluate(() => { document.documentElement.dataset.reduceTransparency = 'true'; });
  await expect(page.locator('.public-nav-surface')).toHaveCSS('backdrop-filter', 'none');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('.landing-actions a').focus();
  await expect(page.locator('.landing-actions a')).toBeFocused();
  observations.push({ authenticatedCTA: true, systemDark: true, reducedMotion: true, increasedContrast: true, forcedColors: true, realAPI: false });
});

test('actual auth form submits unchanged payload and follows learner, onboarding and admin redirects', async ({ page }) => {
  test.skip(baseline);
  await setup(page, 'light', 'en');
  for (const profile of [
    { mode: 'login', roles: ['LEARNER'], onboardingStatus: 'COMPLETE', destination: '/dashboard' },
    { mode: 'login', roles: ['LEARNER'], onboardingStatus: 'PENDING', destination: '/onboarding' },
    { mode: 'login', roles: ['CONTENT_ADMIN'], onboardingStatus: null, destination: '/admin/content' },
    { mode: 'register', roles: ['LEARNER'], onboardingStatus: 'PENDING', destination: '/onboarding' },
  ]) {
    const user = { ...shellUser, locale: 'en', roles: profile.roles, onboardingStatus: profile.onboardingStatus };
    let submitted: unknown;
    await page.route('**/api/v1/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === `/api/v1/auth/${profile.mode}`) { submitted = route.request().postDataJSON(); return route.fulfill({ json: user }); }
      if (pathname === '/api/v1/me') return route.fulfill({ json: user });
      return route.fulfill({ status: 404, json: { message: 'Outside this auth fixture' } });
    });
    await page.goto('http://127.0.0.1:33300/' + profile.mode);
    if (profile.mode === 'register') await page.locator('[name=displayName]').fill('Minh Anh');
    await page.getByLabel('Email').fill('learner@example.test');
    await page.locator('[name=password]').fill('fixture-password-only');
    await page.locator('form button[type=submit]').click();
    await page.waitForURL('http://127.0.0.1:33300' + profile.destination);
    expect(submitted).toEqual({ email: 'learner@example.test', password: 'fixture-password-only', ...(profile.mode === 'register' ? { displayName: 'Minh Anh', locale: 'en' } : {}) });
    observations.push({ mode: profile.mode, roles: profile.roles, destination: profile.destination, actualFormPayload: true, fixtureAuthentication: true });
    await page.unroute('**/api/v1/**');
  }
});
