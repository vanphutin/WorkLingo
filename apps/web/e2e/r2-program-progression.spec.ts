import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const root = 'C:/Users/ASUS/AppData/Local/Temp/worklingo-r2-20261030';
const fixture = JSON.parse(readFileSync(`${root}/browser-manifest.json`, 'utf8'));
async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ }).selectOption('en');
}

test('Admin publishes a real program and learner completes, unlocks, reloads and resumes', async ({ page, browser }) => {
  const suffix = randomUUID();
  const name = `R2 Browser ${suffix.slice(0, 8)}`;
  await login(page, fixture.accounts.admin);
  await page.goto('/admin/learning-programs');
  await expect(page.getByRole('heading', { name: 'Learning programs', exact: true })).toBeVisible();
  await page.getByLabel('Slug', { exact: true }).fill(`r2-browser-${suffix}`);
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Description', { exact: true }).fill('Isolated actual Admin to Learner slice');
  await page.getByLabel('Learning goal', { exact: true }).fill('Complete and resume source-bound lessons');
  await page.getByLabel('Proficiency label', { exact: true }).fill('A1–A2 practice');
  await page.getByLabel('Display order', { exact: true }).fill(String(1000 + Number.parseInt(suffix.slice(0, 4), 16)));
  await page.getByRole('button', { name: 'Create program', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Publish curriculum', exact: true })).toBeVisible();
  const catalogResponse = await page.request.get('/api/v1/admin/learning-programs');
  expect(catalogResponse.ok()).toBe(true);
  const program = (await catalogResponse.json()).programs.find((row: { name: string }) => row.name === name);
  expect(program).toBeTruthy();
  async function post(path: string, body: unknown, status = 200) {
    const response = await page.request.post(`/api/v1${path}`, { data: body });
    expect(response.status(), await response.text()).toBe(status);
    return response.json();
  }
  async function put(path: string, body: unknown) {
    const response = await page.request.put(`/api/v1${path}`, { data: body });
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  }
  const path = await post('/admin/curriculum/paths', { programId: program.id, name: 'Browser path', slug: `path-${suffix}`, idempotencyKey: randomUUID() }, 201);
  const level = await post('/admin/curriculum/levels', { pathId: path.id, code: `BROWSER_${suffix.replaceAll('-', '_').toUpperCase()}`, name: 'Browser practice', cefrReference: 'A1', idempotencyKey: randomUUID() }, 201);
  const revisions: string[] = [];
  const titles = ['Browser lesson one', 'Browser lesson two'];
  const activities = fixture.lessonVersion.parsedContent.activities;
  const evidence = ['reading', 'listening', 'speaking', 'writing'].map(skill => activities.find((activity: { activityType: string; learningBlock: string }) => activity.activityType === skill && activity.learningBlock !== 'activate'));
  for (const [index, title] of titles.entries()) {
    const mission = await post('/admin/curriculum/missions', { levelId: level.id, slug: `browser-${index}-${suffix}`, title, objective: 'Practice all four skills', purpose: 'LEARNING', order: index + 1, idempotencyKey: randomUUID() }, 201);
    const attached = await put(`/admin/curriculum/missions/${mission.id}/lessons`, { lessonIds: [fixture.lessonVersion.lessonId], expectedRevision: mission.revision, idempotencyKey: randomUUID() });
    await post(`/admin/curriculum/missions/${mission.id}/publish`, { expectedRevision: attached.revision, idempotencyKey: randomUUID() });
    await put(`/admin/curriculum/missions/${mission.id}/foundation`, { expectedRevision: null, idempotencyKey: randomUUID(), definition: { category: 'grammar', prerequisiteRevisionIds: index ? [revisions[0]] : [], objectives: evidence.map(activity => ({ slug: `complete-${activity.activityType}`, statement: `Complete ${activity.activityType} practice`, skills: [activity.activityType], required: true, evidence: [{ lessonVersionId: fixture.lessonVersion.id, activitySlug: activity.slug, languageBlockSlugs: [] }] })) } });
    await post(`/admin/curriculum/missions/${mission.id}/foundation/validate`, { expectedRevision: 1, idempotencyKey: randomUUID() });
    const revision = await post(`/admin/curriculum/missions/${mission.id}/foundation/publish`, { expectedRevision: 1, idempotencyKey: randomUUID() });
    revisions.push(revision.id);
  }
  await post(`/admin/curriculum/levels/${level.id}/publish`, { expectedRevision: level.revision, idempotencyKey: randomUUID() });
  await post(`/admin/curriculum/paths/${path.id}/publish`, { expectedRevision: path.revision, idempotencyKey: randomUUID() });
  await page.getByLabel('Curriculum revision IDs').fill(revisions.join('\n'));
  await page.getByRole('button', { name: 'Publish program', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Program published.');
  await page.screenshot({ path: `${root}/admin-program.png`, fullPage: true });

  const learnerContext = await browser.newContext({ storageState: { cookies: [{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }], origins: [] } });
  const learner = await learnerContext.newPage();
  // Exercise the product's explicit unscored typed fallback; no synthetic audio score is asserted.
  await learner.addInitScript(() => { Object.defineProperty(window, 'MediaRecorder', { value: undefined, configurable: true }); });
  await login(learner, fixture.accounts.learner);
  await learner.goto('/programs');
  await learner.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ }).selectOption('en');
  await expect.poll(async () => (await (await learner.request.get('/api/v1/me')).json()).locale).toBe('en');
  const openProgram = learner.getByRole('button', { name: `Open ${name} program`, exact: true });
  await expect(openProgram).toBeVisible({ timeout: 30_000 });
  await openProgram.click();
  await expect(learner).toHaveURL(/\/dashboard$/);
  await learner.getByRole('tab', { name: 'Progress', exact: true }).click();
  const firstCard = learner.getByRole('article', { name: titles[0], exact: true });
  const secondCard = learner.getByRole('article', { name: titles[1], exact: true });
  await expect(firstCard.getByRole('button', { name: `Start ${titles[0]}`, exact: true })).toBeVisible();
  await expect(secondCard.getByRole('button', { name: `Start ${titles[1]}`, exact: true })).toHaveCount(0);
  await firstCard.getByRole('button', { name: `Start ${titles[0]}`, exact: true }).click();
  await expect(learner).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  const sessionId = learner.url().split('/').at(-1)!;
  const sessionResponse = await learner.request.get(`/api/v1/learning-sessions/${sessionId}`);
  const session = await sessionResponse.json();
  const activityIds = session.plan.blocks.flatMap((block: { activityIds: string[] }) => block.activityIds);
  for (const [index, activityId] of activityIds.entries()) {
    const activity = activities.find((row: { id: string }) => row.id === activityId);
    if (activity.activityType === 'reading' || activity.activityType === 'listening') {
      for (const question of activity.payload.questions) await learner.getByLabel(question.options[question.answerIndex], { exact: true }).check();
    } else if (activity.activityType === 'writing') {
      await learner.getByLabel('Your written response:', { exact: true }).fill('Hello. My name is An. I work in sales. Nice to meet you.');
    } else {
      await learner.locator('#spoken-response-input').fill('Hello. My name is An. I work in sales. Nice to meet you.');
    }
    await learner.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.poll(async () => (await (await learner.request.get(`/api/v1/learning-sessions/${sessionId}`)).json()).currentCheckpoint).toBe(index + 1);
  }
  await expect(learner.getByRole('heading', { name: 'Session Completed!' })).toBeVisible();
  await learner.getByRole('link', { name: 'Return to Dashboard' }).click();
  await learner.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(learner.getByRole('article', { name: titles[0], exact: true }).getByText('Completed', { exact: true }).first()).toBeVisible();
  await learner.getByRole('article', { name: titles[1], exact: true }).getByRole('button', { name: `Start ${titles[1]}`, exact: true }).click();
  await expect(learner).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  const secondSessionId = learner.url().split('/').at(-1)!;
  await learner.getByRole('button', { name: 'Pause session', exact: true }).click();
  await learner.goto('/dashboard');
  await learner.getByRole('tab', { name: 'Progress', exact: true }).click();
  const resume = learner.getByRole('article', { name: titles[1], exact: true }).getByRole('link');
  await expect(resume).toHaveAttribute('href', `/sessions/${secondSessionId}`);
  await learner.reload();
  await learner.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(resume).toBeVisible();
  await learner.screenshot({ path: `${root}/learner-roadmap.png`, fullPage: true });
  await learner.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => learner.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await learner.screenshot({ path: `${root}/learner-mobile.png`, fullPage: true });
  await resume.click();
  await expect(learner).toHaveURL(new RegExp(`/sessions/${secondSessionId}$`));
  const finalRoadmap = await (await learner.request.get('/api/v1/me/curriculum-roadmap')).json();
  expect(finalRoadmap.items.map((item: { state: string }) => item.state)).toEqual(['completed', 'in_progress']);
  writeFileSync(`${root}/browser-receipt.json`, JSON.stringify({ provenance: 'SYNTHETIC_ACTUAL_UI_API_POSTGRES', programId: program.id, revisionIds: revisions, sessionIds: [sessionId, secondSessionId], attempts: activityIds.length, roadmap: finalRoadmap, humanParticipants: 0, providerCalls: 0 }, null, 2));
  await learnerContext.close();
});
