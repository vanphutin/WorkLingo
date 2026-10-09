import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('Foundation 60-Minute Learning Session Journey', () => {
  test('learner restores the checkpoint, completes the seeded session, and sees progress', async ({
    page,
  }, testInfo) => {
    const uniqueId = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    const email = `learner_${uniqueId}@example.test`;
    const password = 'A_Very_Secure_Password_123!';
    const displayName = `Learner ${uniqueId}`;

    // 1. Register learner
    await page.goto('/register');
    await page.getByLabel('Display name').fill(displayName);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page).toHaveTitle('Learner Dashboard | WorkLingo');
    await expect(page.getByRole('heading', { name: 'Learner Dashboard' })).toBeVisible();

    if (testInfo.project.name === 'foundation-mobile') {
      await expectNoHorizontalOverflow(page);
      const signOutBox = await page.getByRole('button', { name: 'Sign out' }).boundingBox();
      expect(signOutBox?.height).toBeGreaterThanOrEqual(44);
    }

    // 2. Verify 60-minute default duration and launcher
    const durationSelect = page.getByLabel(/session duration/i);
    await expect(durationSelect).toHaveValue('60');

    // 3. Start 60-minute session
    await page.getByRole('button', { name: /start 60-minute session/i }).click();

    // Verify navigated to session shell
    await expect(page).toHaveURL(/.*\/sessions\/.+/);
    await expect(page.getByText('Activate', { exact: true })).toBeVisible();
    await expect(page.getByText('Read & Decode', { exact: true })).toBeVisible();
    await expect(page.getByText('Listen & Reason', { exact: true })).toBeVisible();
    await expect(page.getByText('Respond', { exact: true })).toBeVisible();

    if (testInfo.project.name === 'foundation-mobile') {
      const mainBox = await page.getByRole('main').boundingBox();
      const supportBox = await page.getByRole('complementary').boundingBox();
      const pauseBox = await page.getByRole('button', { name: 'Pause session' }).boundingBox();
      expect(mainBox).not.toBeNull();
      expect(supportBox).not.toBeNull();
      expect(pauseBox?.height).toBeGreaterThanOrEqual(44);
      expect(supportBox!.y).toBeGreaterThan(mainBox!.y);
    }

    // 4. Complete the Activate writing activity
    await page
      .getByLabel('Your written response:')
      .fill('My name is An and I am happy to meet you.');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Read & Decode');

    // 5. Reload the page (refresh/resume test)
    await page.reload();

    // 6. Confirm the server checkpoint restores the second activity, not the first
    await expect(page.locator('[aria-current="step"]')).toContainText('Read & Decode');
    await expect(page.getByLabel('Your written response:')).toHaveCount(0);

    // 7. Complete Read & Decode
    await page.getByLabel('To welcome An and help An meet the team.').check();
    await page.getByLabel('Go to Mai’s desk to meet the team with her.').check();
    await page.getByLabel('Ask Mai for help.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Listen & Reason');

    // 8. Complete Listen & Reason
    await page.getByLabel('Mai works in support and An works in sales.').check();
    await page.getByLabel('An needs help finding the meeting room.').check();
    const lessonAudio = page.getByLabel('Lesson audio');
    await expect(lessonAudio).toBeVisible();
    const audioUrl = await lessonAudio.getAttribute('src');
    expect(audioUrl).toBeTruthy();
    const audioResponse = await page.request.get(audioUrl!);
    expect(audioResponse.status()).toBe(200);
    expect(audioResponse.headers()['content-type']).toContain('audio/wav');
    expect((await audioResponse.body()).subarray(0, 4).toString('ascii')).toBe('RIFF');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText('Respond');

    // 9. Complete the speaking recording and final writing transfer task
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

    await expect(page.getByRole('heading', { name: 'Session Completed!' })).toBeVisible();
    await page.getByRole('link', { name: 'Return to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Learner Dashboard' })).toBeVisible();

    // 10. Verify persisted progress summary. Reading and listening finish
    // synchronously; Teacher AI work remains queued and must not be counted yet.
    await expect(page.getByText('Current Level')).toBeVisible();
    await expect(page.getByText('FOUNDATION_1')).toBeVisible();
    await expect(page.getByText('Completed Activities').locator('..')).toContainText('2');
    await expect(page.getByText('Completed Sessions').locator('..')).toContainText('1');
  });
});
