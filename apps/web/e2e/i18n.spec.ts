import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow } from './helpers/learner-onboarding';

const password = 'I18n-secure-password-123!';
function hydrationErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (/hydration|hydrated|didn't match/iu.test(message.text()) && message.type() === 'error') errors.push(message.text()); });
  return errors;
}
async function register(page: Page, locale: 'vi' | 'en') {
  const email = `i18n-${randomUUID()}@example.test`;
  const response = await page.request.post('/api/v1/auth/register', { data: { displayName: 'Nguyễn An', email, password, locale } });
  expect(response.status()).toBe(201);
  return { email, password, id: (await response.json()).id as string };
}
async function switchLocale(page: Page, locale: 'vi' | 'en') {
  await page.locator('.language-control select').first().selectOption(locale);
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('.language-control select').first()).toHaveAttribute('aria-busy', 'false');
}

test('guest SSR, reload, immediate auth labels, keyboard and mobile layout', async ({ page }) => {
  const errors = hydrationErrors(page);
  const response = await page.goto('/login');
  expect(await response?.text()).toContain('lang="vi"');
  await expect(page.getByRole('heading', { name: 'Chào mừng bạn trở lại' })).toBeVisible();
  await page.getByLabel('Email').fill('guest@example.test');
  const select = page.getByRole('combobox', { name: 'Ngôn ngữ giao diện' });
  await select.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByLabel('Email')).toHaveValue('guest@example.test');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Interface language' })).toHaveValue('en');
  await page.goto('/register');
  await expect(page.getByLabel('Display name')).toBeVisible();
  for (const viewport of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await switchLocale(page, 'vi');
    await expectNoHorizontalOverflow(page);
    await switchLocale(page, 'en');
  }
  expect(errors).toEqual([]);
});

test('unknown URLs render the localized shared missing-page state', async ({ page }) => {
  const errors = hydrationErrors(page);
  await page.goto('/login');
  await switchLocale(page, 'en');
  await page.goto('/missing-i18n-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to WorkLingo' })).toHaveAttribute('href', '/');
  await page.goto('/login');
  await switchLocale(page, 'vi');
  await page.goto('/missing-i18n-page');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('account preference wins at login, navigation, tabs, reload and another device', async ({ page, context, browser }) => {
  const errors = hydrationErrors(page);
  const user = await register(page, 'vi');
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await switchLocale(page, 'en');
  expect(await (await page.request.get('/api/v1/me/preferences')).json()).toEqual({ locale: 'en' });
  const second = await context.newPage();
  await second.goto('/programs');
  await expect(second.locator('html')).toHaveAttribute('lang', 'en');
  await switchLocale(page, 'vi');
  await expect(second.locator('html')).toHaveAttribute('lang', 'vi');
  await switchLocale(page, 'en');
  for (const route of ['/programs', '/settings', '/dashboard']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await switchLocale(page, 'vi');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const device = await browser.newContext();
  const devicePage = await device.newPage();
  expect((await devicePage.request.post('/api/v1/auth/login', { data: { email: user.email, password } })).ok()).toBeTruthy();
  await devicePage.goto(new URL('/dashboard', page.url()).toString());
  await expect(devicePage.locator('html')).toHaveAttribute('lang', 'en');
  await device.close();
  await second.close();
  expect(errors).toEqual([]);
});

test('switching during a lesson preserves English content, draft and progression identifiers', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = hydrationErrors(page);
  await register(page, 'en');
  await completeSelfPlacementViaApi(page);
  const created = await page.request.post('/api/v1/learning-sessions', { data: { clientSessionId: randomUUID(), durationMinutes: 60 } });
  expect(created.status()).toBe(201);
  const session = await created.json();
  const activityId = session.plan.blocks[0].activityIds[0];
  const activityBefore = await (await page.request.get(`/api/v1/learning-sessions/${session.id}/activities/${activityId}`)).json();
  await page.goto(`/sessions/${session.id}`);
  const answer = page.locator('textarea').first();
  await expect(answer).toBeVisible();
  await answer.fill('My name is An. I work with the team.');
  const before = await (await page.request.get(`/api/v1/learning-sessions/${session.id}`)).json();
  await switchLocale(page, 'vi');
  await expect(answer).toHaveValue('My name is An. I work with the team.');
  const after = await (await page.request.get(`/api/v1/learning-sessions/${session.id}`)).json();
  expect(after.id).toBe(before.id);
  expect(after.lessonVersionId).toBe(before.lessonVersionId);
  expect(after.plan).toEqual(before.plan);
  expect(after.currentCheckpoint).toBe(before.currentCheckpoint);
  expect(after.attempts).toEqual(before.attempts);
  expect(await (await page.request.get(`/api/v1/learning-sessions/${session.id}/activities/${activityId}`)).json()).toEqual(activityBefore);
  await switchLocale(page, 'en');
  await expect(answer).toHaveValue('My name is An. I work with the team.');
  expect(errors).toEqual([]);
});

test('another account in the same browser does not inherit the previous server preference', async ({ page }) => {
  await register(page, 'en');
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await register(page, 'vi');
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  expect(await (await page.request.get('/api/v1/me/preferences')).json()).toEqual({ locale: 'vi' });
});

test('an account changed in another tab transitions identity and locale together on focus', async ({ page }) => {
  const first = await register(page, 'en');
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('combobox', { name: 'Interface language' })).toHaveValue('en');
  await page.request.post('/api/v1/auth/logout');
  const second = await register(page, 'vi');
  expect(second.id).not.toBe(first.id);
  await completeSelfPlacementViaApi(page);
  const reloaded = page.waitForEvent('load');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await reloaded;
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  const current = await (await page.request.get('/api/v1/me')).json();
  expect(current.id).toBe(second.id);
  expect(current.locale).toBe('vi');
});

test('admin preference persists across routes with complete selected UI translations', async ({ page }) => {
  const errors = hydrationErrors(page);
  expect((await page.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).ok()).toBeTruthy();
  expect((await page.request.patch('/api/v1/me/preferences', { data: { locale: 'vi' } })).ok()).toBeTruthy();
  await page.goto('/admin/content');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.getByRole('link', { name: 'Nội dung', exact: true })).toBeVisible();
  await switchLocale(page, 'en');
  for (const route of ['/admin/curriculum', '/admin/audit', '/admin/operations', '/admin/analytics', '/admin/settings/audio']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(errors).toEqual([]);
});
