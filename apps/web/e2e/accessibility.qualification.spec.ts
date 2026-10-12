import { expect, test } from '@playwright/test';

test('public registration remains keyboard reachable at zoom and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const viewport = page.viewportSize();
  if (viewport) {
    await page.setViewportSize({
      height: viewport.height,
      width: Math.max(320, Math.floor(viewport.width / 2)),
    });
  }
  await page.goto('/register');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: /skip/i }).first();
  if (await skipLink.count()) await expect(skipLink).toBeFocused();

  for (const label of ['Display name', 'Email', 'Password']) {
    const input = page.getByLabel(label);
    await expect(input).toBeVisible();
    const fontSize = await input.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  }
  const submit = page.getByRole('button', { name: 'Create account' });
  const box = await submit.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
