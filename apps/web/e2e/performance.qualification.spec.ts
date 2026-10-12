import { expect, test } from '@playwright/test';

test('public shell has no interaction-blocking navigation waterfall', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const timing = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return { domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime };
  });
  expect(timing.domContentLoaded).toBeLessThan(5_000);
});
