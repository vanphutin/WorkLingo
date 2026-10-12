import { expect, test } from '@playwright/test';
import {
  completeSelfPlacementViaApi,
  expectNoHorizontalOverflow,
} from './helpers/learner-onboarding';

test.describe('Weekly Engagement and Progress Evidence Journey', () => {
  test('tracks weekly mission, protects active week target changes, and surfaces progress evidence', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    const email = `engagement_${suffix}@example.test`;
    const password = 'Engagement-Pass-123!';
    const displayName = `Engagement Learner ${suffix}`;

    // 1. Register learner and complete self-placement
    await page.goto('/register');
    await page.getByLabel('Display name').fill(displayName);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/.*\/onboarding/);
    await completeSelfPlacementViaApi(page);
    await page.goto('/dashboard');

    // 2. Initial engagement panel state
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Weekly Mission & Evidence' })).toBeVisible();

    // Verify initial mission and consistency stats
    await expect(page.getByText('0 of 3 learning days')).toBeVisible();
    await expect(page.getByText('0-week consistency')).toBeVisible();

    // Verify target selector options and default value
    const targetSelect = page.locator('#weekly-target-select');
    await expect(targetSelect).toBeVisible();
    await expect(targetSelect).toHaveValue('3');

    // Verify 44px touch target on target select
    const targetBox = await targetSelect.boundingBox();
    expect(targetBox?.height).toBeGreaterThanOrEqual(44);

    // Verify evidence of progress empty state
    await expect(page.getByRole('heading', { name: 'Evidence of Progress' })).toBeVisible();
    await expect(page.getByText('0 sessions')).toBeVisible();
    await expect(page.getByText('0 study days')).toBeVisible();

    // Check insufficient evidence labels
    const insufficientBadges = page.locator('.status-insufficient_evidence');
    await expect(insufficientBadges).toHaveCount(4);

    // 3. Update target before any study days are completed (immediate change)
    await targetSelect.focus();
    await targetSelect.selectOption('4');
    await expect(page.getByText('0 of 4 learning days')).toBeVisible();
    await expect(page.locator('.effective-target-notice')).toHaveCount(0);

    // Check no horizontal overflow on initial dashboard
    await expectNoHorizontalOverflow(page);

    // 4. Start and complete an ordinary 60-minute session
    await page.getByRole('button', { name: /start 60-minute session/i }).click();
    await expect(page).toHaveURL(/.*\/sessions\/.+/);

    // Step 1: Activate
    await page
      .getByLabel('Your written response:')
      .fill('My name is An and I am happy to meet you.');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Read & Decode');

    // Step 2: Read & Decode
    await page.getByLabel('To welcome An and help An meet the team.').check();
    await page.getByLabel('Go to Mai’s desk to meet the team with her.').check();
    await page.getByLabel('Ask Mai for help.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Listen & Reason');

    // Step 3: Listen & Reason
    await page.getByLabel('Mai works in support and An works in sales.').check();
    await page.getByLabel('An needs help finding the meeting room.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Respond');

    // Step 4: Respond (speaking + writing)
    await page.getByRole('button', { name: 'Record response' }).click();
    await page.waitForTimeout(750);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await page.getByLabel('Recording preview').waitFor();
    await page.getByRole('checkbox', { name: /consent/i }).check();
    await page.getByRole('button', { name: 'Send for evaluation' }).click();
    await page
      .getByLabel('Your written response:')
      .fill('Hello Linh. My name is An. I work in sales. Do you need help with this project today?');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Session completion confirmation
    await expect(page.getByRole('heading', { name: 'Session Completed!' })).toBeVisible();
    await page.getByRole('link', { name: 'Return to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Learner Dashboard' })).toBeVisible();

    // 5. Verify updated engagement projections
    await expect(page.getByText('1 of 4 learning days')).toBeVisible();
    await expect(page.getByText('1 sessions')).toBeVisible();
    await expect(page.getByText('1 study days')).toBeVisible();

    // 6. Update target after study has started: must protect current week and defer to next week
    await targetSelect.selectOption('2');
    await expect(page.getByText('1 of 4 learning days')).toBeVisible();
    await expect(page.locator('.effective-target-notice')).toBeVisible();
    await expect(page.locator('.effective-target-notice')).toContainText(
      'Target will update to 2 days next week',
    );

    // 7. Verify responsiveness and no overflow
    await expectNoHorizontalOverflow(page);
  });
});
