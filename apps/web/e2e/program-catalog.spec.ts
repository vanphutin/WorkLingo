import { expect, test } from '@playwright/test';

import {
  completeSelfPlacementViaApi,
  expectNoHorizontalOverflow,
  registerLearner,
} from './helpers/learner-onboarding';

const PROGRAM_NAMES = ['Beginner', 'Intermediate', 'TOEIC', 'IELTS'] as const;
const UNAVAILABLE_PROGRAM_NAMES = ['Beginner', 'TOEIC', 'IELTS'] as const;

test.describe('Learner Program Catalog E2E Journey', () => {
  test('learner explores the catalog without opening unavailable programs', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const uniqueId = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    let sessionCreationRequests = 0;
    let activationRequests = 0;

    page.on('request', (request) => {
      const requestUrl = new URL(request.url());
      if (request.method() === 'POST' && requestUrl.pathname === '/api/v1/learning-sessions') {
        sessionCreationRequests += 1;
      }
      if (request.method() === 'PUT' && requestUrl.pathname === '/api/v1/me/program-context') activationRequests += 1;
    });

    await registerLearner(page, {
      displayName: `Program Learner ${uniqueId}`,
      email: `program_${uniqueId.toLowerCase()}@example.com`,
    });
    await completeSelfPlacementViaApi(page);

    await page.goto('/programs');
    await expect(page.getByRole('heading', { level: 1, name: 'Choose your learning program' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Learning programs' }).getByRole('listitem')).toHaveCount(4);
    await expectNoHorizontalOverflow(page);

    for (const programName of PROGRAM_NAMES) {
      await expect(page.getByRole('heading', { level: 2, name: programName })).toBeVisible();
    }

    await expect(page.getByText(/Active program:/)).toContainText('Intermediate');
    const activationResponse = page.waitForResponse((response) => response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/v1/me/program-context');
    await page.getByRole('button', { name: 'Open Intermediate program' }).click();
    expect((await activationResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/u);
    expect(activationRequests).toBe(1);
    expect(sessionCreationRequests).toBe(0);
    await page.reload();
    await expect(page.getByText(/Active program:/)).toContainText('Intermediate');
    const contextResponse = await page.request.get('/api/v1/me/program-context');
    expect(contextResponse.status()).toBe(200);
    const activeContext = await contextResponse.json();
    expect(activeContext.enrollment.revision).toBe(1);
    await page.getByRole('button', { name: 'Start 60-Minute Session' }).click();
    await expect(page).toHaveURL(/\/sessions\/[\da-f-]+$/u);
    const sessionUrl = page.url();
    const sessionId = new URL(sessionUrl).pathname.split('/').at(-1);
    const sessionBefore = await (await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
    await page.reload();
    await expect(page).toHaveURL(sessionUrl);
    const sessionAfter = await (await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
    expect(sessionAfter.lessonVersionId).toBe(sessionBefore.lessonVersionId);
    expect(sessionAfter.plan).toEqual(sessionBefore.plan);

    await page.goto('/programs');
    const catalogUrl = page.url();

    for (const programName of UNAVAILABLE_PROGRAM_NAMES) {
      const unavailableAction = page.getByRole('button', {
        name: `${programName} program unavailable`,
      });
      await expect(unavailableAction).toBeDisabled();
      await unavailableAction.dispatchEvent('keydown', { key: 'Enter' });
      await unavailableAction.dispatchEvent('keydown', { key: ' ' });
      await expect(page).toHaveURL(catalogUrl);
    }

    const rejected = await page.request.put('/api/v1/me/program-context', { data: { programSlug: 'ielts', expectedRevision: activeContext.enrollment.revision } });
    expect(rejected.status()).toBe(422);
    expect((await rejected.json()).code).toBe('PROGRAM_UNAVAILABLE');
    expect(await (await page.request.get('/api/v1/me/program-context')).json()).toEqual(activeContext);
    expect(sessionCreationRequests).toBe(1);
  });
});
