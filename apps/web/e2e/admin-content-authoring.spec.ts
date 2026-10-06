import { expect, test, type Page } from '@playwright/test';

import { createValidLessonSource, loginAsContentAdmin } from './helpers/content-admin';

interface SessionVersionSnapshot {
  readonly id: string;
  readonly lessonVersionId: string;
}

async function readCurrentSession(page: Page): Promise<SessionVersionSnapshot> {
  const sessionId = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
  if (!sessionId) throw new Error('Expected the page URL to contain a learning-session ID');

  return page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/learning-sessions/${id}`);
    if (!response.ok) throw new Error(`Unable to read learning session: ${response.status}`);
    return response.json() as Promise<SessionVersionSnapshot>;
  }, sessionId);
}

test.describe('Content Authoring & Publishing Acceptance Journey', () => {
  test('admin authors, validates, previews audio, publishes lesson version, and verifies session isolation', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const uniqueId = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    const learnerPassword = 'A_Very_Secure_Password_123!';

    // Session S1 binds to the currently published immutable version N.
    await page.goto('/register');
    await page.getByLabel('Display name').fill(`Learner ${uniqueId}`);
    await page.getByLabel('Email').fill(`learner_${uniqueId}@example.test`);
    await page.getByLabel('Password').fill(learnerPassword);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/.*\/dashboard/);
    await page.getByRole('button', { name: /start 60-minute session/i }).click();
    await expect(page).toHaveURL(/.*\/sessions\/.+/);

    const s1Url = page.url();
    const s1BeforePublish = await readCurrentSession(page);
    await expect(page.getByText('Introduce yourself to a new colleague')).toBeVisible();

    const adminContext = await browser.newContext({
      viewport: testInfo.project.use?.viewport,
      userAgent: testInfo.project.use?.userAgent,
    });
    const adminPage = await adminContext.newPage();
    let publishedLessonVersionId: string | undefined;

    try {
      await loginAsContentAdmin(adminPage);
      await adminPage.getByRole('link', { name: /new import/i }).click();
      await expect(adminPage).toHaveURL(/.*\/admin\/content\/new/);

      const invalidSource = `FORMAT: WorkLingoLesson/1.0\n\n[LESSON]\nslug: first-day-introductions\n`;
      await adminPage.getByLabel(/lesson source/i).fill(invalidSource);
      await adminPage.getByRole('button', { name: /import draft/i }).click();

      await adminPage.waitForURL(/\/admin\/content\/[0-9a-f-]+/, { timeout: 15_000 });
      await expect(adminPage.getByRole('heading', { name: 'Lesson Authoring' })).toBeVisible();

      await adminPage.getByRole('tab', { name: /^validation/i }).click();
      await adminPage.getByRole('button', { name: /validate draft/i }).click();
      const errorItem = adminPage.getByRole('button', { name: /VAL_|title/i }).first();
      await expect(errorItem).toBeVisible();
      await errorItem.click();

      const editorTextarea = adminPage.getByLabel(/lesson source editor/i);
      await expect(editorTextarea).toBeFocused();

      const updatedTitle = `Your First Day at Work - Sprint V2 ${uniqueId}`;
      const validSource = createValidLessonSource('first-day-introductions', updatedTitle);
      const autosaveResponse = adminPage.waitForResponse(
        (response) =>
          response.request().method() === 'PATCH' &&
          /\/api\/v1\/admin\/content-imports\/[0-9a-f-]+\/source$/u.test(response.url()) &&
          response.status() === 200,
      );
      await editorTextarea.fill(validSource);
      await autosaveResponse;
      await expect(adminPage.getByText('Saved')).toBeVisible();

      await adminPage.getByRole('tab', { name: /^validation/i }).click();
      await adminPage.getByRole('button', { name: /validate draft/i }).click();
      await expect(adminPage.getByText('VALIDATED')).toBeVisible();
      await expect(adminPage.getByText(/No issues detected/i)).toBeVisible();

      await adminPage.getByRole('tab', { name: /^preview/i }).click();
      await expect(adminPage.getByRole('heading', { name: updatedTitle })).toBeVisible();
      await expect(
        adminPage.getByText('Audio mô phỏng — chưa phải giọng đọc phát hành'),
      ).toBeVisible();

      await adminPage.getByRole('button', { name: /generate audio/i }).first().click();
      await expect(adminPage.getByText('READY')).toBeVisible({ timeout: 20_000 });
      await expect(adminPage.locator('audio').first()).toBeVisible();

      await adminPage.getByRole('tab', { name: /^publish/i }).click();
      await expect(adminPage.getByText('Kiểm tra định dạng (Validation)')).toBeVisible();

      const publishButton = adminPage.getByRole('button', { name: /publish lesson/i });
      await expect(publishButton).toBeEnabled();
      const publishResponsePromise = adminPage.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/api\/v1\/admin\/content-imports\/[0-9a-f-]+\/publish$/u.test(response.url()) &&
          response.status() === 200,
      );
      await publishButton.click();
      const published = (await (await publishResponsePromise).json()) as {
        lessonVersionId: string;
        version: number;
      };
      publishedLessonVersionId = published.lessonVersionId;

      await expect(adminPage.getByText(`Published Version: ${published.version}`)).toBeVisible({
        timeout: 15_000,
      });
      await expect(adminPage.getByRole('button', { name: /archive version/i })).toBeVisible();
      await expect(adminPage.getByRole('button', { name: /delete/i })).toHaveCount(0);

      await adminPage.getByRole('tab', { name: /source/i }).click();
      await expect(editorTextarea).toHaveAttribute('readonly');
    } finally {
      await adminContext.close().catch(() => undefined);
    }

    expect(publishedLessonVersionId).toBeTruthy();

    // S1 still points to N after N+1 is published.
    await page.goto(s1Url);
    await expect(page.getByText('Introduce yourself to a new colleague')).toBeVisible();
    const s1AfterPublish = await readCurrentSession(page);
    expect(s1AfterPublish.id).toBe(s1BeforePublish.id);
    expect(s1AfterPublish.lessonVersionId).toBe(s1BeforePublish.lessonVersionId);
    expect(s1AfterPublish.lessonVersionId).not.toBe(publishedLessonVersionId);

    // A newly created session S2 binds to N+1.
    const learner2Context = await browser.newContext({
      viewport: testInfo.project.use?.viewport,
      userAgent: testInfo.project.use?.userAgent,
    });
    const learner2Page = await learner2Context.newPage();

    try {
      await learner2Page.goto('/register');
      await learner2Page.getByLabel('Display name').fill(`Learner 2 ${uniqueId}`);
      await learner2Page.getByLabel('Email').fill(`learner2_${uniqueId}@example.test`);
      await learner2Page.getByLabel('Password').fill(learnerPassword);
      await learner2Page.getByRole('button', { name: 'Create account' }).click();

      await expect(learner2Page).toHaveURL(/.*\/dashboard/);
      await learner2Page.getByRole('button', { name: /start 60-minute session/i }).click();
      await expect(learner2Page).toHaveURL(/.*\/sessions\/.+/);

      const s2 = await readCurrentSession(learner2Page);
      expect(s2.lessonVersionId).toBe(publishedLessonVersionId);
      expect(s2.lessonVersionId).not.toBe(s1BeforePublish.lessonVersionId);
    } finally {
      await learner2Context.close().catch(() => undefined);
    }
  });
});
