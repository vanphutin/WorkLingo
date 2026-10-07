import { expect, test } from '@playwright/test';

test('learner sees own evidence, transfers a review, and cannot advance on unscored work', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}_${testInfo.project.name}`;
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Adaptive learner');
  await page.getByLabel('Email').fill(`adaptive_${suffix}@example.test`);
  await page.getByLabel('Password').fill('Adaptive-local-password-123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  const durations = page.getByLabel(/session duration/i);
  await expect(durations).toHaveValue('60');
  await expect(durations.locator('option[value="90"]')).toBeDisabled();
  await durations.selectOption('45');
  await page.getByRole('button', { name: /start 45-minute session/i }).click();
  await expect(page).toHaveURL(/\/sessions\//u);
  const oldSessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  const oldSession = await (await page.request.get(`/api/v1/learning-sessions/${oldSessionId}`)).json();
  expect(oldSession.blocks).toHaveLength(3);
  await page.reload();
  await expect(page.locator('[aria-current="step"]')).toContainText('Read & Decode');
  await page.getByLabel('To ask An to help a customer.').check();
  await page.getByLabel('Wait for a customer.').check();
  await page.getByLabel('Go home.').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/Review the evidence and try again/i)).toBeVisible();

  await page.goto('/mastery');
  await expect(page.getByRole('heading', { name: 'Mastery Map', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Speaking memory health' })).toContainText('Unassessed');
  await expect(page.getByRole('article', { name: 'Reading mastery: Do you need help?' })).toContainText('0%');
  await expect(page.getByRole('heading', { name: 'Review queue' })).toBeVisible();
  await page.getByLabel('Filter errors by skill').selectOption('reading');
  await expect(page.locator('.error-entries')).toContainText('Do you need help?');
  await page.getByLabel('Filter errors by skill').selectOption('speaking');
  await expect(page.getByText(/No errors recorded for speaking/i)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await page.goto('/dashboard');
  await expect(page.getByText('Welcome a customer to your workplace')).toBeVisible();
  await page.getByRole('button', { name: /start 60-minute session/i }).click();
  await expect(page).toHaveURL(/\/sessions\//u);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  const session = await (await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
  expect(session.plan.reviewSelections).toEqual([expect.objectContaining({ transferred: true })]);
  // The shell starts asynchronously; API-driven completion must await the same transition.
  const started = await page.request.post(`/api/v1/learning-sessions/${sessionId}/start`);
  expect(started.status()).toBe(200);
  const ids = session.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
  for (const [index, activityId] of ids.entries()) {
    const response = index === 1 ? { answerIndexes: [0, 1, 1] } :
      index === 2 ? { answerIndexes: [2, 0] } :
      { text: 'Hello Linh. My name is An. I work in sales. Nice to meet you. Do you need help finding reception today?' };
    const submitted = await page.request.post(`/api/v1/activities/${activityId}/attempts`, {
      data: { sessionId, clientAttemptId: crypto.randomUUID(), response },
    });
    expect(submitted.status(), await submitted.text()).toBe(201);
  }
  const unchanged = await (await page.request.get(`/api/v1/learning-sessions/${oldSessionId}`)).json();
  expect(unchanged.lessonVersionId).toBe(oldSession.lessonVersionId);
  expect(unchanged.currentCheckpoint).toBe(0);
  await page.goto('/mastery');
  const assessmentResponse = page.waitForResponse((response) =>
    response.url().endsWith('/me/checkpoint-assessments') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Assess completed session' }).click();
  const assessment = await (await assessmentResponse).json();
  expect(assessment.status).toBe('not_ready'); // The first mission is still incomplete.
  expect(assessment.canAdvance).toBe(false);
  expect(assessment.skills.speaking.score).toBeNull();
  expect(assessment.skills.speaking.pendingCount).toBeGreaterThan(0);
  await expect(page.getByText(/evaluation pending|pending evaluation|awaiting evaluation/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm next level' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/evaluation pending|pending evaluation|awaiting evaluation/i).first()).toBeVisible();
});
