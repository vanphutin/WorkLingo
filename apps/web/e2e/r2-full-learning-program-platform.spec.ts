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
async function evidence(page: Page, name: string) {
  for (const [label, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844]] as const) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `${root}/task6-${name}-${label}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test('real UI authors, publishes, enrolls, completes, unlocks, resumes, reports and preserves old release pins', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const suffix = randomUUID().slice(0, 8), name = `R2 Full UI ${suffix}`;
  const pathName = `UI path ${suffix}`, levelName = `UI stage ${suffix}`;
  const units = [`UI unit one ${suffix}`, `UI unit two ${suffix}`];
  const activities = fixture.lessonVersion.parsedContent.activities;
  await login(page, fixture.accounts.admin);
  await page.goto('/admin/learning-programs');
  await page.getByLabel('Slug', { exact: true }).fill(`r2-full-ui-${suffix}`);
  await page.getByLabel('Name', { exact: true }).fill(name);
  await page.getByLabel('Description', { exact: true }).fill('Synthetic actual UI qualification');
  await page.getByLabel('Learning goal', { exact: true }).fill('Practice all four skills and retain exact releases');
  await page.getByLabel('Proficiency label', { exact: true }).fill('A1–A2');
  await page.getByLabel('Display order', { exact: true }).fill(String(1000 + Number.parseInt(suffix.slice(0, 4), 16)));
  await page.getByRole('button', { name: 'Create program', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open curriculum builder', exact: true })).toBeVisible();
  const catalog = await (await page.request.get('/api/v1/admin/learning-programs')).json();
  const program = catalog.programs.find((p: { name: string }) => p.name === name);
  await page.getByRole('link', { name: 'Open curriculum builder', exact: true }).click();
  await page.getByRole('button', { name: '+ New Path', exact: true }).click();
  await page.getByLabel('Path Name', { exact: true }).fill(pathName);
  await page.getByLabel('Learning Program', { exact: true }).selectOption(program.id);
  await page.getByLabel('Slug', { exact: true }).fill(`ui-path-${suffix}`);
  await page.getByRole('button', { name: 'Create Path', exact: true }).click();
  const path = page.getByRole('region', { name: `Learning Path ${pathName}`, exact: true });
  await path.getByRole('button', { name: '+ Add Level', exact: true }).click();
  await page.getByLabel('Level Code (e.g. BEG_1)', { exact: true }).fill(`UI_${suffix.toUpperCase()}`);
  await page.getByLabel('Level Name', { exact: true }).fill(levelName);
  await page.getByLabel('CEFR Reference (e.g. A1)', { exact: true }).fill('A1');
  await page.getByRole('button', { name: 'Create Level', exact: true }).click();
  for (const [index, unit] of units.entries()) {
    await path.getByRole('button', { name: '+ Add Mission', exact: true }).click();
    await page.getByLabel('Mission Title', { exact: true }).fill(unit);
    await page.getByLabel('Slug', { exact: true }).fill(`ui-unit-${index}-${suffix}`);
    await page.getByLabel('Objective', { exact: true }).fill('Practice reading, listening, speaking and writing');
    await page.getByRole('button', { name: 'Create Mission', exact: true }).click();
    const mission = page.locator('.mission-card').filter({ has: page.getByRole('heading', { name: unit, exact: true }) });
    await mission.getByRole('button', { name: 'Attach and order lessons', exact: true }).click();
    await mission.getByRole('button', { name: `Add ${fixture.lessonVersion.parsedContent.title}`, exact: true }).click();
    await mission.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(mission.locator('.lessons-list')).toContainText(fixture.lessonVersion.parsedContent.title);
    await mission.getByRole('button', { name: `Publish Mission ${unit}`, exact: true }).click();
    await mission.getByRole('button', { name: `Edit Foundation definition for ${unit}`, exact: true }).click();
    const editor = page.getByRole('region', { name: `Foundation definition for ${unit}`, exact: true });
    await editor.getByLabel('Objective slug', { exact: true }).fill(`four-skills-${index}`);
    await editor.getByLabel('Objective statement', { exact: true }).fill('Complete actual four-skill activities');
    for (const skill of ['listening', 'speaking', 'writing']) await editor.getByLabel(`Objective 1 ${skill}`, { exact: true }).check();
    for (const [activityIndex, skill] of ['reading', 'listening', 'speaking', 'writing'].entries()) {
      if (activityIndex) await editor.getByRole('button', { name: 'Add evidence mapping to objective 1', exact: true }).click();
      const prefix = activityIndex ? `Objective 1 evidence ${activityIndex + 1}` : 'Objective evidence';
      await editor.getByLabel(`${prefix} lesson version`, { exact: true }).selectOption(fixture.lessonVersion.id);
      const activity = activities.find((a: { activityType: string; learningBlock: string }) => a.activityType === skill && a.learningBlock !== 'activate');
      await editor.getByLabel(`${prefix} activity`, { exact: true }).selectOption(activity.slug);
    }
    if (index) await editor.getByLabel(`${units[0]} · revision 1`, { exact: true }).check();
    await editor.getByRole('button', { name: 'Save Foundation draft', exact: true }).click();
    await expect(editor.getByRole('status')).toContainText('Foundation draft saved.');
    await editor.getByRole('button', { name: 'Validate Foundation draft', exact: true }).click();
    await expect(editor.getByRole('status')).toContainText('Foundation draft validated.');
    await editor.getByRole('button', { name: 'Publish Foundation revision', exact: true }).click();
    await expect(editor.getByRole('status')).toContainText('Foundation revision published successfully.');
    await editor.getByRole('button', { name: 'Close Foundation editor', exact: true }).click();
  }
  await page.getByRole('button', { name: `Publish Level ${levelName}`, exact: true }).click();
  await page.getByRole('button', { name: `Publish Path ${pathName}`, exact: true }).click();
  await evidence(page, 'builder-en');
  await page.goto(`/admin/learning-programs?programId=${program.id}`);
  for (const unit of units) await page.getByRole('button', { name: `Add ${unit}`, exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'In review', exact: true })).toBeVisible();
  for (const status of ['In review', 'Approved', 'Published']) await page.getByRole('button', { name: status, exact: true }).click();
  await expect(page.getByText('This release is immutable.', { exact: false })).toBeVisible();
  const firstRelease = (await (await page.request.get(`/api/v1/admin/learning-programs/${program.id}/versions`)).json()).items[0];
  await evidence(page, 'release-en');

  const learnerContext = await browser.newContext();
  const learner = await learnerContext.newPage();
  await learner.addInitScript(() => { Object.defineProperty(window, 'MediaRecorder', { value: undefined, configurable: true }); });
  await login(learner, fixture.accounts.learner);
  await learner.goto('/programs');
  await learner.getByRole('button', { name: `Open ${name} program`, exact: true }).click();
  await expect(learner).toHaveURL(/\/dashboard$/);
  async function progress() {
    await learner.goto('/programs');
    await learner.locator('li').filter({ has: learner.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Program progress', exact: true }).click();
    await expect(learner.getByRole('heading', { name: 'Program progress', exact: true })).toBeVisible();
  }
  await progress();
  await expect(learner.getByText('Unknown · No qualified score', { exact: false }).first()).toBeVisible();
  await expect(learner.getByText('A prerequisite is not ready.', { exact: true })).toBeVisible();
  const originalEnrollment = (await (await learner.request.get('/api/v1/me/program-enrollments')).json()).items.find((e: { programId: string }) => e.programId === program.id);
  const enrollmentPath = `/api/v1/me/program-enrollments/${originalEnrollment.id}`;
  const before = await (await learner.request.get(`${enrollmentPath}/progress`)).json();
  expect(before.items.map((i: { state: string }) => i.state)).toEqual(['available', 'locked']);
  await evidence(learner, 'locked-en');
  const sessions: string[] = [];
  let actualProgress = before;
  for (let round = 0; round < 5 && !actualProgress.items[0].completed; round++) {
    await learner.getByRole('button', { name: 'Start lesson', exact: true }).first().click();
    await expect(learner).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
    const sessionId = learner.url().split('/').at(-1)!;
    sessions.push(sessionId);
    const session = await (await learner.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
    for (const [index, id] of session.plan.blocks.flatMap((b: { activityIds: string[] }) => b.activityIds).entries()) {
      const activity = activities.find((a: { id: string }) => a.id === id);
      if (activity.activityType === 'reading' || activity.activityType === 'listening') {
        for (const question of activity.payload.questions) await learner.getByLabel(question.options[question.answerIndex], { exact: true }).check();
      } else if (activity.activityType === 'writing') {
        await learner.getByLabel('Your written response:', { exact: true }).fill('Hello. My name is An. I work in sales. Nice to meet you.');
      } else await learner.locator('#spoken-response-input').fill('Hello. My name is An. I work in sales. Nice to meet you.');
      await learner.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect.poll(async () => (await (await learner.request.get(`/api/v1/learning-sessions/${sessionId}`)).json()).currentCheckpoint).toBe(index + 1);
    }
    await expect(learner.getByRole('heading', { name: 'Session Completed!', exact: true })).toBeVisible();
    await progress();
    actualProgress = await (await learner.request.get(`${enrollmentPath}/progress`)).json();
  }
  expect(actualProgress.items[0]).toMatchObject({ completed: true, ready: true });
  expect(actualProgress.items[1]).toMatchObject({ state: 'available', completed: false });
  expect(actualProgress.evidenceDimensions.find((d: { dimension: string }) => d.dimension === 'speaking').score).toBeNull();
  expect(actualProgress.nextAction).toMatchObject({ curriculumRevisionId: actualProgress.items[1].curriculumRevisionId, lessonVersionId: actualProgress.items[1].lessonVersionId });
  // The recommended next action can share the same lesson source with unit one.
  // Bind the interruption to the unlocked unit, not an arbitrary Start button.
  await learner.getByRole('heading', { name: 'Recommended next action', exact: true }).locator('..').getByRole('button', { name: 'Start lesson', exact: true }).click();
  await expect(learner).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  const pausedId = learner.url().split('/').at(-1)!;
  const paused = await (await learner.request.get(`/api/v1/learning-sessions/${pausedId}`)).json();
  expect(paused).toMatchObject({ plan: { missionId: actualProgress.items[1].missionId }, curriculumRevisionId: actualProgress.items[1].curriculumRevisionId, lessonVersionId: actualProgress.items[1].lessonVersionId });
  await learner.getByRole('button', { name: 'Pause session', exact: true }).click();
  await progress();
  await learner.reload();
  await learner.locator('li').filter({ has: learner.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Program progress', exact: true }).click();
  const resume = learner.getByRole('link', { name: 'Resume session', exact: true }).first();
  await expect(resume).toHaveAttribute('href', `/sessions/${pausedId}`);
  await evidence(learner, 'resume-en');
  await learner.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ }).selectOption('vi');
  await expect(learner.getByRole('heading', { name: 'Tiến trình chương trình', exact: true })).toBeVisible();
  await evidence(learner, 'resume-vi');
  await learner.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ }).selectOption('en');
  await resume.focus();
  await learner.keyboard.press('Enter');
  await expect(learner).toHaveURL(new RegExp(`/sessions/${pausedId}$`));
  const pausedState = await (await learner.request.get(`/api/v1/learning-sessions/${pausedId}`)).json();
  expect(pausedState).toMatchObject({ status: 'paused', currentCheckpoint: paused.currentCheckpoint });
  await learner.getByRole('button', { name: 'Resume session', exact: true }).click();
  await expect.poll(async () => (await (await learner.request.get(`/api/v1/learning-sessions/${pausedId}`)).json()).status).toBe('in_progress');
  const resumed = await (await learner.request.get(`/api/v1/learning-sessions/${pausedId}`)).json();
  expect(resumed).toMatchObject({ currentCheckpoint: paused.currentCheckpoint, lessonVersionId: paused.lessonVersionId, curriculumRevisionId: paused.curriculumRevisionId, plan: paused.plan });

  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await page.getByLabel('From (UTC)', { exact: true }).fill(new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  await page.getByLabel('To (UTC, exclusive)', { exact: true }).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Load analytics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Summary', exact: true })).toBeVisible();
  const summary = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Summary', exact: true }) }).last();
  await expect(summary.locator('div').filter({ has: page.locator('dt', { hasText: /^Active learners$/ }) }).locator('dd')).toHaveText('1');
  await evidence(page, 'analytics-en');
  await page.getByRole('button', { name: 'Releases', exact: true }).click();
  await page.getByRole('button', { name: 'Version 1', exact: true }).click();
  await page.getByRole('button', { name: 'Copy release to new draft', exact: true }).click();
  for (const status of ['In review', 'Approved', 'Published']) await page.getByRole('button', { name: status, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Version 2', exact: true })).toBeVisible();
  const afterEnrollment = (await (await learner.request.get('/api/v1/me/program-enrollments')).json()).items.find((e: { id: string }) => e.id === originalEnrollment.id);
  expect(afterEnrollment.programVersionId).toBe(originalEnrollment.programVersionId);
  expect(afterEnrollment.curriculumRevisionIds).toEqual(originalEnrollment.curriculumRevisionIds);
  const oldPreview = await (await page.request.get(`/api/v1/admin/learning-programs/${program.id}/versions/${firstRelease.id}/preview`)).json();
  expect(oldPreview).toEqual(firstRelease);
  await learner.goto('/programs');
  await expect(learner.locator('li').filter({ has: learner.getByRole('heading', { name, exact: true }) }).getByText('Pinned release: Version 1', { exact: false })).toBeVisible();
  writeFileSync(`${root}/task6-browser-receipt.json`, JSON.stringify({ provenance: 'SYNTHETIC_REAL_UI_NEST_POSTGRES', capturedAt: new Date().toISOString(), programId: program.id, enrollmentId: originalEnrollment.id, oldRelease: firstRelease.id, completedSessions: sessions, pausedSession: pausedId, resumedSession: { id: pausedId, status: resumed.status, currentCheckpoint: resumed.currentCheckpoint }, progress: actualProgress, humanParticipants: 0, realProviderCalls: 0 }, null, 2));
  await learnerContext.close();
});
