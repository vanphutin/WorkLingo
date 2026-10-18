import { expect, test } from '@playwright/test';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow, registerLearner } from './helpers/learner-onboarding';
import { loginAsContentAdmin } from './helpers/content-admin';

test('learner dashboard shows own program data and empty evidence across themes and viewport sizes', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const displayName = 'A'.repeat(80);
  await registerLearner(page, { displayName, email: `dashboard-v2-${Date.now()}@example.test` });
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: `Welcome back, ${displayName}` })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your learning programs' })).toBeVisible();
  await expect(page.getByText('No skill assessments in this period.', { exact: true })).toBeVisible();
  await expect(page.getByText('No learning sessions in this period.', { exact: true })).toBeVisible();
  const response = await page.request.get('/api/v1/me/dashboard');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.activeProgramSlug).toBe('intermediate');
  expect(data.programs.filter((program: { enrolled: boolean }) => program.enrolled)).toHaveLength(1);
  expect(data.skills).toEqual([]);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await expectNoHorizontalOverflow(page);
    await page.getByLabel('Color theme').click();
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({ path: testInfo.outputPath('learner-dashboard-v2.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start 60-Minute Session', exact: true }).click();
  await expect(page).toHaveURL(/\/sessions\//);
});

test('admin overview and program workspaces retain global tools and reject learner-only metrics', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await loginAsContentAdmin(page);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Program performance', exact: true })).toBeVisible();
  const response = await page.request.get('/api/v1/admin/analytics/overview');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.programs).toHaveLength(4);
  expect(data.activity).toHaveLength(14);
  expect((await page.request.get('/api/v1/me/dashboard')).status()).toBe(403);
  await page.getByLabel('Search programs').fill('TOEIC');
  await expect(page.getByRole('table', { name: 'Program performance', exact: true }).getByRole('row')).toHaveCount(2);
  await page.getByLabel('Search programs').clear();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await expectNoHorizontalOverflow(page);
    await page.getByLabel('Color theme').click();
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({ path: testInfo.outputPath('admin-overview-v2.png'), fullPage: true });
  await page.goto('/admin/programs/ielts');
  await expect(page.getByRole('heading', { name: 'IELTS', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumbs' })).toContainText('IELTS');
  await expect(page.getByRole('heading', { name: 'Program management', exact: true })).toBeVisible();
  await page.goto('/admin/settings/audio');
  await expect(page.getByRole('heading', { name: 'Audio generation settings', exact: true })).toBeVisible();
});
