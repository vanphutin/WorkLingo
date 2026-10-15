import { expect, test } from '@playwright/test';
import {
  completeSelfPlacementViaApi,
  expectNoHorizontalOverflow,
} from './helpers/learner-onboarding';

test.describe('Onboarding and placement assessment journey', () => {
  test('learner registers, completes self-placement, confirms level, and lands on dashboard', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}_self`;

    await page.goto('/register');
    await page.getByLabel('Display name').fill('Self Placement Learner');
    await page.getByLabel('Email').fill(`learner_${suffix}@example.test`);
    await page.getByLabel('Password').fill('Self-Placement-Pass-123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding$/u);
    await expect(page.getByRole('heading', { name: 'Choose how to begin' })).toBeVisible();

    const methodRadio = page.getByLabel('Choose my starting level');
    await methodRadio.focus();
    await page.keyboard.press('Space');
    await expect(methodRadio).toBeChecked();
    const levelRadio = page.getByLabel('Foundation 1');
    await levelRadio.focus();
    await page.keyboard.press('Space');
    await expect(levelRadio).toBeChecked();

    const confirmButton = page.getByRole('button', { name: 'Confirm starting level' });
    const buttonBox = await confirmButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

    await confirmButton.focus();
    await expect(confirmButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/u);
    await expect(page.getByRole('heading', { name: "Today's learning", exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test('pending learner cannot bypass route guards to access dashboard or ordinary sessions', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}_guard`;

    await page.goto('/register');
    await page.getByLabel('Display name').fill('Pending Guard Learner');
    await page.getByLabel('Email').fill(`pending_${suffix}@example.test`);
    await page.getByLabel('Password').fill('Pending-Guard-Pass-123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding$/u);

    // Direct dashboard navigation should redirect back to /onboarding
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/onboarding$/u);

    // Direct session navigation should redirect back to /onboarding
    await page.goto('/sessions/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/onboarding$/u);
  });

  test('completed learner bypasses onboarding and is redirected to dashboard', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}_bypass`;

    await page.goto('/register');
    await page.getByLabel('Display name').fill('Completed Learner');
    await page.getByLabel('Email').fill(`completed_${suffix}@example.test`);
    await page.getByLabel('Password').fill('Completed-Bypass-Pass-123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding$/u);
    await completeSelfPlacementViaApi(page);

    // Navigating back to /onboarding should redirect to /dashboard
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/dashboard$/u);
  });

  test('learner starts placement, resumes after refresh, completes all four skills, and confirms recommendation', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}_placement`;

    await page.goto('/register');
    await page.getByLabel('Display name').fill('Placement Learner');
    await page.getByLabel('Email').fill(`placement_${suffix}@example.test`);
    await page.getByLabel('Password').fill('Placement-Pass-123!');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/onboarding$/u);

    // Select placement assessment
    await page.getByLabel('Take a placement assessment').check();
    const startButton = page.getByRole('button', { name: 'Start assessment' });
    const startBox = await startButton.boundingBox();
    expect(startBox?.height).toBeGreaterThanOrEqual(44);
    await startButton.click();

    await expect(page).toHaveURL(/\/onboarding\/placement\//u);
    await expect(page.getByText('Placement assessment', { exact: true })).toBeVisible();

    // Verify refresh restores session and checkpoint
    await page.reload();
    await expect(page.getByText('Placement assessment', { exact: true })).toBeVisible();

    // 1. Reading activity
    await page.getByLabel('The warehouse sent final numbers late.').check();
    await page.getByLabel('A short update without a promised delivery date.').check();
    await page.getByLabel('Ask Lan in Operations.').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 2. Listening activity
    await page.getByLabel('The arrival day for 40 units.').check();
    await page.getByLabel('After Friday’s shipment arrives.').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 3. Speaking activity
    await page.getByRole('button', { name: 'Record response' }).click();
    await page.waitForTimeout(750);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await page.getByLabel('Recording preview').waitFor();
    await page.getByRole('checkbox', { name: /consent/i }).check();
    await page.getByRole('button', { name: 'Send for evaluation' }).click();

    // 4. Writing activity
    await page.getByLabel('Your written response:').fill(
      'Hello, we are checking the final shipment details. Forty units are now expected on Friday. We will confirm the delivery date after they arrive.',
    );
    await page.getByRole('button', { name: 'Continue' }).click();

    // Verify completed screen with completionHref pointing to /onboarding
    await expect(page.getByRole('heading', { name: 'Placement assessment complete' })).toBeVisible();
    const reviewLink = page.getByRole('link', { name: 'Review assessment status' });
    expect(await reviewLink.getAttribute('href')).toBe('/onboarding');
    await reviewLink.click();

    await expect(page).toHaveURL(/\/onboarding$/u);
    await expect(page.getByRole('heading', { name: 'Assessment evidence' })).toBeVisible();

    // The E2E fake provider injects retryable failures; the durable worker keeps the attempt
    // processing until retries succeed without losing the completed learner session.
    const processingStatus = page.getByRole('status');
    if (await processingStatus.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(processingStatus).toContainText('Teacher AI is finishing your evaluation');
    }

    // Terminal provider failures expose an explicit manual retry instead of silently restarting.
    const retryButton = page.getByRole('button', { name: 'Retry evaluation' });
    if (await retryButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await retryButton.click();
    }

    // Wait for recommendation
    const confirmRecommendedButton = page.getByRole('button', { name: /confirm recommended level/i });
    await expect(confirmRecommendedButton).toBeVisible({ timeout: 20_000 });

    const confirmBox = await confirmRecommendedButton.boundingBox();
    expect(confirmBox?.height).toBeGreaterThanOrEqual(44);

    await confirmRecommendedButton.click();
    await expect(page).toHaveURL(/\/dashboard$/u);
    await expect(page.getByRole('heading', { name: "Today's learning", exact: true })).toBeVisible();

    // Verify placement evidence is isolated from ordinary learning mastery
    await page.goto('/mastery');
    await expect(page.getByRole('heading', { name: 'Mastery Map', exact: true })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Speaking memory health' })).toContainText('Unassessed');
    const readingMastery = page.getByRole('article', { name: 'Reading mastery: Do you need help?' });
    await expect(readingMastery).toContainText('Unassessed');
    await expect(readingMastery).toContainText('No evaluated evidence yet.');
    await expect(readingMastery).not.toContainText(/\d+%/u);

    await expectNoHorizontalOverflow(page);
  });
});
