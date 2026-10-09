import { expect, test } from '@playwright/test';

test.describe('Teacher AI speaking and writing journey', () => {
  test('records, resumes processing, retries safely and preserves a writing draft', async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    const suffix = `${Date.now()}_${testInfo.project.name}`;

    await page.goto('/register');
    await page.getByLabel('Display name').fill('Teacher AI learner');
    await page.getByLabel('Email').fill(`teacher_ai_${suffix}@example.test`);
    await page.getByLabel('Password').fill('Teacher-AI-local-password-123!');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/u);
    await page.getByRole('button', { name: /start 60-minute session/i }).click();
    await expect(page).toHaveURL(/\/sessions\//u);
    const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;

    await page.getByLabel('Your written response:').fill(
      `My name is An and I am happy to meet the team today. [e2e-rate-limit:${suffix}]`,
    );
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('button', { name: /thử đánh giá lại/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /thử đánh giá lại/i }).click();
    await expect(page.locator('.teacher-feedback-result')).toBeVisible({ timeout: 15_000 });

    await page.getByLabel('To welcome An and help An meet the team.').check();
    await page.getByLabel('Go to Mai’s desk to meet the team with her.').check();
    await page.getByLabel('Ask Mai for help.').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    const lessonAudio = page.getByLabel('Lesson audio');
    await expect(lessonAudio).toHaveAttribute('src', new RegExp(`/learning-sessions/${sessionId}/activities/.+/audio$`, 'u'));
    await expect(lessonAudio).not.toHaveAttribute('autoplay', /.*/u);
    await page.getByLabel('Mai works in support and An works in sales.').check();
    await page.getByLabel('An needs help finding the meeting room.').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: 'Record response' }).click();
    await expect(page.getByText('Recording in progress…')).toBeVisible();
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(page.getByLabel('Recording preview')).toBeVisible();
    await page.getByRole('checkbox', { name: /consent/i }).check();
    await page.getByRole('button', { name: 'Send for evaluation' }).click();

    await expect(page.getByLabel('Your written response:')).toBeVisible();
    await page.reload();
    await expect(page.locator('.teacher-feedback-result')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Delete recording now' }).click();
    await expect(page.getByText(/recording audio has been deleted/i)).toBeVisible();
    await expect(page.locator('.teacher-feedback-result')).toBeVisible();

    const finalWriting = 'Hello Mai. My name is An. I work in sales. Do you need help with the customer report today?';
    await page.getByLabel('Your written response:').fill(finalWriting);
    await expect(page.getByText('Đã lưu bản nháp')).toBeVisible({ timeout: 5_000 });
    await page.reload();
    await expect(page.getByLabel('Your written response:')).toHaveValue(finalWriting);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Session Completed!' })).toBeVisible();
    await expect(page.locator('.teacher-feedback-result')).toBeVisible({ timeout: 20_000 });

    if (testInfo.project.name.endsWith('mobile')) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});
