import path from 'node:path';
import { expect, test } from '@playwright/test';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow, registerLearner } from './helpers/learner-onboarding';
import { loginAsContentAdmin } from './helpers/content-admin';

async function setTheme(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await page.locator('html').getAttribute('data-theme') === theme) break;
    await page.getByRole('button', { name: /color theme/i }).click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

const widths = [320, 375, 430, 720, 768, 1024, 1440]; // 720 represents 1440px at 200% zoom.
const evidence = (name: string) => path.resolve(__dirname, '../../../docs', `ui-redesign-${name}.png`);

test('real learner and admin routes reflow, retain answers and support themes and keyboard', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|hydrated|didn't match/i.test(message.text())) errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  for (const route of ['/', '/login', '/register']) {
    await page.goto(route);
    await expect(page.getByLabel('Color theme')).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 960 });
      await expectNoHorizontalOverflow(page);
    }
    await page.screenshot({ path: evidence(route === '/' ? 'landing' : route.slice(1)), fullPage: true });
  }
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByLabel('Display name')).toBeFocused();
  await registerLearner(page, {
    displayName: 'Người học tiếng Anh cho giao tiếp và công việc quốc tế',
    email: `ui-redesign-${Date.now()}@example.test`,
  });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: evidence('onboarding'), fullPage: true });
  await completeSelfPlacementViaApi(page);

  for (const route of ['/dashboard', '/programs', '/mastery', '/settings/audio', '/ielts/orientation', '/ielts/bridge', '/ielts/pathway', '/ielts/practice', '/ielts/mock-tests']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main [role="status"]').filter({ hasText: /loading/i })).toHaveCount(0);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 960 });
      await expectNoHorizontalOverflow(page);
      await setTheme(page, 'dark');
      await expectNoHorizontalOverflow(page);
      const controlContrast = await page.locator('main input:not([type="radio"]):not([type="checkbox"]), main textarea, main select').evaluateAll((controls) => {
        const lum = (color: string) => {
          const rgb = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => v / 255)
            .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return .2126 * rgb[0]! + .7152 * rgb[1]! + .0722 * rgb[2]!;
        };
        return controls.filter((element) => {
          const style = getComputedStyle(element);
          const a = lum(style.color), b = lum(style.backgroundColor);
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05) < 4.5;
        }).map((element) => element.id || element.tagName);
      });
      expect(controlContrast).toEqual([]);
      await setTheme(page, 'light');
    }
    if (route === '/dashboard') await page.screenshot({ path: evidence('dashboard-light'), fullPage: true });
    if (route === '/programs') await page.screenshot({ path: evidence('programs'), fullPage: true });
    if (route === '/mastery') await page.screenshot({ path: evidence('mastery'), fullPage: true });
  }
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  await setTheme(page, 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Start 60-Minute Session' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 960 });
  await page.screenshot({ path: evidence('dashboard-dark-mobile'), fullPage: true });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to learning content' })).toBeFocused();
  const skipContrast = await page.getByRole('link', { name: 'Skip to learning content' }).evaluate((element) => {
    const luminance = (color: string) => {
      const rgb = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map((v) => v / 255)
        .map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return .2126 * rgb[0]! + .7152 * rgb[1]! + .0722 * rgb[2]!;
    };
    const style = getComputedStyle(element);
    const a = luminance(style.color), b = luminance(style.backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  expect(skipContrast).toBeGreaterThanOrEqual(4.5);
  await page.keyboard.press('Enter');
  await expect(page.locator('#learner-main-content')).toBeFocused();
  await page.getByRole('button', { name: 'Start 60-Minute Session' }).click();
  await expect(page.getByLabel('Your written response:')).toBeVisible();
  await page.getByLabel('Your written response:').fill('My name is An and I am happy to meet you.');
  await expect(page.getByText('Draft saved', { exact: true })).toBeVisible();
  await setTheme(page, 'light');
  await expect(page.getByLabel('Your written response:')).toHaveValue('My name is An and I am happy to meet you.');
  await page.getByRole('button', { name: 'Pause session' }).click();
  await expect(page.getByRole('button', { name: 'Resume session' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Your written response:')).toHaveValue('My name is An and I am happy to meet you.');
  await page.getByRole('button', { name: 'Resume session' }).click();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({ path: evidence('session'), fullPage: true });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await loginAsContentAdmin(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await expectNoHorizontalOverflow(page);
  }
  await setTheme(page, 'dark');
  await page.screenshot({ path: evidence('admin-dark'), fullPage: true });
  await expect(page.getByRole('link', { name: 'Content', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});
