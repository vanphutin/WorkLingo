import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow } from './helpers/learner-onboarding';

test('AI account settings persist, switch language and protect unavailable providers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.request.post('/api/v1/auth/register', { data: { displayName: 'AI Settings Learner', email: `ai-${randomUUID()}@example.test`, password: 'AI-settings-password-123!', locale: 'en' } });
  expect(response.status()).toBe(201);
  await completeSelfPlacementViaApi(page);
  await page.goto('/settings');
  await page.getByRole('link', { name: /AI settings/ }).click();
  await expect(page.getByRole('heading', { name: 'AI settings', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: /OpenAI/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Allow fallback/ }).uncheck();
  await page.getByRole('button', { name: 'Save AI settings' }).click();
  await expect(page.getByRole('status')).toHaveText('AI settings saved.');
  await page.reload();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.locator('.language-control select').first().selectOption('vi');
  await expect(page.getByRole('heading', { name: 'Cài đặt AI', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (test.info().project.name === 'ai-settings-mobile') await page.screenshot({ path: '../../docs/ai-settings-learner-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('admin AI page exposes global and account settings without provider secrets', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS });
  expect(login.status()).toBe(200);
  await page.request.patch('/api/v1/me/preferences', { data: { locale: 'en' } });
  await page.goto('/admin/settings/ai');
  await expect(page.getByRole('heading', { name: 'System AI settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI settings', exact: true })).toBeVisible();
  const settings = await page.request.get('/api/v1/admin/ai-settings');
  expect(settings.status()).toBe(200);
  expect(await settings.text()).not.toMatch(/apiKey|Bearer|sk-/u);
  await expectNoHorizontalOverflow(page);
  if (test.info().project.name === 'ai-settings-desktop') await page.screenshot({ path: '../../docs/ai-settings-admin-desktop.png', fullPage: true });
});
