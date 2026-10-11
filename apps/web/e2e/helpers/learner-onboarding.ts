import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function completeSelfPlacementViaApi(
  page: Page,
  chosenLevelCode = 'FOUNDATION_1',
): Promise<void> {
  const response = await page.request.post('/api/v1/me/onboarding/self-placement', {
    data: {
      clientConfirmationId: crypto.randomUUID(),
      selectedLevelCode: chosenLevelCode,
    },
  });
  expect(response.status()).toBe(200);
}

export async function registerLearner(
  page: Page,
  options: {
    displayName: string;
    email: string;
    password?: string;
  },
): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Display name').fill(options.displayName);
  await page.getByLabel('Email').fill(options.email);
  await page.getByLabel('Password').fill(options.password ?? 'Learner-Secure-Password-123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/u);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}
