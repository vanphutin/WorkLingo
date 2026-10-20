import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { loginAsContentAdmin } from './helpers/content-admin';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow, registerLearner } from './helpers/learner-onboarding';

interface Mission {
  id: string; levelId: string; revision: number; slug: string; title: string;
  lessons: Array<{ id: string; currentPublishedVersionId: string | null }>;
}
interface CurriculumTree { paths: Array<{ levels: Array<{ missions: Mission[] }> }> }

const requestJson = async <T>(request: APIRequestContext, method: 'get' | 'post' | 'put', path: string, data?: unknown): Promise<T> => {
  const response = await request[method](path, data === undefined ? undefined : { data });
  if (!response.ok()) {
    throw new Error(`${method.toUpperCase()} ${path}: ${response.status()} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
};

async function publishDefinition(request: APIRequestContext, mission: Mission, prerequisiteRevisionIds: string[] = []) {
  const draft = await requestJson<{ revision: number | null }>(request, 'get', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`);
  const lessonVersionId = mission.lessons[0]?.currentPublishedVersionId;
  if (!lessonVersionId) throw new Error('Mission requires a published lesson version');
  const definition = {
    category: 'reading', prerequisiteRevisionIds,
    objectives: [{
      slug: 'understand-workplace-message', statement: 'Understand the main purpose of a workplace message.',
      skills: ['reading'], required: true,
      evidence: [{ lessonVersionId, activitySlug: 'understand-welcome', languageBlockSlugs: [] }],
    }],
  };
  const saved = await requestJson<{ revision: number }>(request, 'put', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`, {
    definition, expectedRevision: draft.revision, idempotencyKey: crypto.randomUUID(),
  });
  await requestJson(request, 'post', `/api/v1/admin/curriculum/missions/${mission.id}/foundation/validate`, {
    expectedRevision: saved.revision, idempotencyKey: crypto.randomUUID(),
  });
  return requestJson<{ id: string }>(request, 'post', `/api/v1/admin/curriculum/missions/${mission.id}/foundation/publish`, {
    expectedRevision: saved.revision, idempotencyKey: crypto.randomUUID(),
  });
}

async function completeSession(page: Page, sessionId: string) {
  const session = await requestJson<{ plan: { blocks: Array<{ activityIds: string[] }> } }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  for (const activityId of session.plan.blocks.flatMap((block) => block.activityIds)) {
    const activity = await requestJson<{ slug: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}/activities/${activityId}`);
    const response = activity.slug === 'understand-welcome' ? { answerIndexes: [0, 1, 1] }
      : activity.slug === 'understand-colleague' ? { answerIndexes: [2, 0] }
      : { text: 'Hello Linh. My name is An. I work in sales. Do you need help with this task today?' };
    await requestJson(page.request, 'post', `/api/v1/activities/${activityId}/attempts`, {
      sessionId, clientAttemptId: crypto.randomUUID(), response,
    });
  }
}

test('published objective evidence completes one pinned revision and unlocks its dependent unit', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${testInfo.project.name}`;
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  let sourceMission!: Mission;
  let dependentMission!: Mission;
  let sourceRevisionId!: string;
  let dependentRevisionId!: string;

  try {
    await loginAsContentAdmin(adminPage);
    const tree = await requestJson<CurriculumTree>(adminPage.request, 'get', '/api/v1/admin/curriculum');
    sourceMission = tree.paths.flatMap((path) => path.levels).flatMap((level) => level.missions)
      .find((mission) => mission.slug === 'introduce-yourself-to-a-new-colleague')!;
    sourceRevisionId = (await publishDefinition(adminPage.request, sourceMission)).id;

    dependentMission = await requestJson<Mission>(adminPage.request, 'post', '/api/v1/admin/curriculum/missions', {
      levelId: sourceMission.levelId, slug: `dependent-${suffix.toLowerCase()}`, title: `Dependent unit ${suffix}`,
      objective: 'Use prior evidence before continuing.', purpose: 'LEARNING', idempotencyKey: crypto.randomUUID(),
    });
    dependentMission = await requestJson<Mission>(adminPage.request, 'put', `/api/v1/admin/curriculum/missions/${dependentMission.id}/lessons`, {
      expectedRevision: dependentMission.revision, lessonIds: [sourceMission.lessons[0]!.id], idempotencyKey: crypto.randomUUID(),
    });
    dependentMission = await requestJson<Mission>(adminPage.request, 'post', `/api/v1/admin/curriculum/missions/${dependentMission.id}/publish`, {
      expectedRevision: dependentMission.revision, idempotencyKey: crypto.randomUUID(),
    });
    dependentRevisionId = (await publishDefinition(adminPage.request, dependentMission, [sourceRevisionId])).id;
  } finally {
    await adminContext.close();
  }

  await registerLearner(page, { displayName: `Curriculum Learner ${suffix}`, email: `curriculum-${suffix}@example.test` });
  await completeSelfPlacementViaApi(page);
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(page.getByRole('article', { name: sourceMission.title })).toContainText('Available');
  await expect(page.getByRole('article', { name: dependentMission.title })).toContainText('Locked');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: /start 60-minute session/i }).click();
  await expect(page).toHaveURL(/\/sessions\/[\da-f-]+$/u);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  const frozenBefore = await requestJson<{ curriculumRevisionId: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  expect(frozenBefore.curriculumRevisionId).toBe(sourceRevisionId);
  await completeSession(page, sessionId);

  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Progress', exact: true }).click();
  await expect(page.getByRole('article', { name: sourceMission.title })).toContainText('Completed');
  await expect(page.getByRole('article', { name: dependentMission.title })).toContainText('Available');

  const adminContext2 = await browser.newContext();
  const adminPage2 = await adminContext2.newPage();
  try {
    await loginAsContentAdmin(adminPage2);
    const newer = await publishDefinition(adminPage2.request, sourceMission);
    expect(newer.id).not.toBe(sourceRevisionId);
  } finally {
    await adminContext2.close();
  }
  const frozenAfter = await requestJson<{ curriculumRevisionId: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  expect(frozenAfter.curriculumRevisionId).toBe(sourceRevisionId);
  const roadmap = await requestJson<{ items: Array<{ revisionId: string; state: string }> }>(page.request, 'get', '/api/v1/me/curriculum-roadmap');
  expect(roadmap.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ revisionId: dependentRevisionId, state: 'available' }),
  ]));
  expect(roadmap.items.some((item) => item.revisionId === sourceRevisionId)).toBe(false);
});

test('real curriculum API retains an unsaved Foundation objective through collapse and filtering', async ({ page }) => {
  await loginAsContentAdmin(page);
  const tree = await requestJson<CurriculumTree>(page.request, 'get', '/api/v1/admin/curriculum');
  const mission = tree.paths.flatMap(path => path.levels).flatMap(level => level.missions)
    .find(item => item.slug === 'introduce-yourself-to-a-new-colleague')!;
  await page.goto('/admin/curriculum');
  await page.getByRole('button', { name: new RegExp(`Edit Foundation.*${mission.title}`, 'i') }).click();
  const statement = page.getByLabel('Objective statement', { exact: true }).first();
  const text = `Unsaved recovery objective ${crypto.randomUUID()}`;
  await statement.fill(text);
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await expect(statement).toHaveValue(text);
  await page.locator('.search-input').fill('no-mission-matches-this-filter');
  await expect(statement).toHaveValue(text);
  await page.locator('.search-input').fill('');
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(statement).toHaveValue(text);
  // The browser draft must not silently write to the real API.
  const stored = await requestJson<{ definition: { objectives: Array<{ statement: string }> } | null }>(page.request, 'get', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`);
  expect(stored.definition?.objectives.some(objective => objective.statement === text) ?? false).toBe(false);
});
