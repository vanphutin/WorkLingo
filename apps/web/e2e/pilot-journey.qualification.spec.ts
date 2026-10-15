import { expect, test } from '@playwright/test';

import { completeSelfPlacementViaApi } from './helpers/learner-onboarding';

test('learner can register, onboard, and see durable pilot progress surfaces', async ({ page }, testInfo) => {
  const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Pilot Qualification Learner');
  await page.getByLabel('Email').fill(`pilot_${suffix}@example.test`);
  await page.getByLabel('Password').fill('Pilot-Qualification-Pass-123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/u);
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: "Today's learning", exact: true })).toBeVisible();
  await expect(page.getByText(/weekly|mission|progress/iu).first()).toBeVisible();
});
