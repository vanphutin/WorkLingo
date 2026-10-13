import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';

interface E2EDatabase {
  ieltsBridgeModule: { findMany(input: unknown): Promise<Array<{ id: string; currentPublishedVersion: { id: string; required: boolean } | null }>> };
  ieltsBridgeProgress: { create(input: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

async function publishCurriculum(context: BrowserContext): Promise<void> {
  expect((await context.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).ok()).toBeTruthy();
  const moduleResponse = await context.request.get('/api/v1/admin/ielts-bridge/modules');
  expect(moduleResponse.ok()).toBeTruthy();
  for (const module of await moduleResponse.json() as Array<{ id: string; draftRevision: number; currentPublishedVersion: unknown }>) {
    if (module.currentPublishedVersion) continue;
    const command = { expectedRevision: module.draftRevision, idempotencyKey: randomUUID() };
    expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${module.id}/validate`, { data: command })).ok()).toBeTruthy();
    expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${module.id}/publish`, { data: { ...command, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
  }
  const profileResponse = await context.request.get('/api/v1/admin/ielts-integrated/profiles');
  expect(profileResponse.ok()).toBeTruthy();
  for (const profile of await profileResponse.json() as Array<{ id: string; draftRevision: number; currentPublishedVersion: unknown }>) {
    if (profile.currentPublishedVersion) continue;
    const command = { expectedRevision: profile.draftRevision, idempotencyKey: randomUUID() };
    expect((await context.request.post(`/api/v1/admin/ielts-integrated/profiles/${profile.id}/validate`, { data: command })).ok()).toBeTruthy();
    expect((await context.request.post(`/api/v1/admin/ielts-integrated/profiles/${profile.id}/publish`, { data: { ...command, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
  }
}

async function grantBridgeCompletion(learnerId: string): Promise<void> {
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL;
  if (!datasourceUrl) throw new Error('WORKLINGO_E2E_DATABASE_URL is required.');
  const apiRequire = createRequire(path.resolve(__dirname, '../../api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => E2EDatabase };
  const database = new PrismaClient({ datasourceUrl });
  try {
    const modules = await database.ieltsBridgeModule.findMany({ where: { currentPublishedVersion: { required: true } }, include: { currentPublishedVersion: true } });
    for (const module of modules) if (module.currentPublishedVersion) await database.ieltsBridgeProgress.create({ data: { learnerId, moduleId: module.id, moduleVersionId: module.currentPublishedVersion.id, currentStageIndex: 9, revision: 11, stageResults: [], completedAt: new Date() } });
  } finally { await database.$disconnect(); }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
}

test('learner configures and resumes an immutable four-skill session without a band score', async ({ browser, page }) => {
  test.setTimeout(120_000);
  await page.goto('/login');
  const admin = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize() ?? undefined });
  try {
    await publishCurriculum(admin);
    const adminPage = await admin.newPage();
    await adminPage.goto('/admin/ielts-integrated');
    await expect(adminPage.getByRole('heading', { level: 1, name: 'Integrated Practice profiles' })).toBeVisible();
    await expectNoHorizontalOverflow(adminPage);
  } finally { await admin.close(); }
  const registration = await page.request.post('/api/v1/auth/register', { data: { displayName: 'Integrated E2E Learner', email: `integrated-${randomUUID()}@test.local`, password: 'integrated-e2e-password' } });
  expect(registration.ok()).toBeTruthy();
  const learner = await registration.json() as { id: string };
  expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy();
  await grantBridgeCompletion(learner.id);
  await page.goto('/ielts/practice');
  await expect(page.getByRole('heading', { level: 1, name: 'Integrated Practice' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByLabel('Duration').selectOption('60');
  await page.getByLabel('Difficulty').selectOption('advanced');
  await page.getByRole('button', { name: 'Start four-skill session' }).click();
  await expect(page.getByText('60 minutes · Advanced')).toBeVisible();
  await expect(page.getByText(/15 minutes/u).first()).toBeVisible();
  await expect(page.getByText(/band score/iu)).toHaveCount(0);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  const before = await (await page.request.get(`/api/v1/me/ielts-integrated/sessions/${sessionId}`)).json() as { plan: { profileVersionId: string; blocks: Array<{ targetMinutes: number }> } };
  expect(before.plan.blocks.map((block) => block.targetMinutes)).toEqual([15, 15, 20, 10]);
  await page.reload();
  await expect(page.getByText('60 minutes · Advanced')).toBeVisible();
  const after = await (await page.request.get(`/api/v1/me/ielts-integrated/sessions/${sessionId}`)).json() as typeof before;
  expect(after.plan.profileVersionId).toBe(before.plan.profileVersionId);
});
