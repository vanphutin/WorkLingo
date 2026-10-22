import { expect, test } from '@playwright/test';

import { openSidebar } from './fixtures/admin-sidebar-contracts';
import { loginAsContentAdmin } from './helpers/content-admin';

test('admin can inspect safe operations and aggregate analytics', async ({ page }) => {
  await loginAsContentAdmin(page);
  const summaryResponse = await page.request.get('/api/v1/admin/operations/summary');
  expect(summaryResponse.status(), await summaryResponse.text()).toBe(200);
  const jobsResponse = await page.request.get('/api/v1/admin/operations/jobs?page=1&pageSize=20');
  expect(jobsResponse.status(), await jobsResponse.text()).toBe(200);
  await page.goto('/admin/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
  await expect(page.getByText('Queue depth')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/authorization|cookie|transcript|rawResponse/iu);

  await openSidebar(page);
  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Pilot Analytics' })).toBeVisible();
  await expect(page.getByText('Week 1 retention')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update range' })).toBeEnabled();
});
