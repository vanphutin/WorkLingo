import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';

interface E2EDatabase {
  ieltsBridgeModule: { findMany(input: unknown): Promise<Array<{ id: string; currentPublishedVersion: { id: string } | null }>> };
  ieltsBridgeProgress: { create(input: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

async function publishBandCurriculum(context: BrowserContext): Promise<number> {
  expect((await context.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).ok()).toBeTruthy();
  const bridgeResponse = await context.request.get('/api/v1/admin/ielts-bridge/modules');
  expect(bridgeResponse.ok()).toBeTruthy();
  for (const module of await bridgeResponse.json() as Array<{ id: string; draftRevision: number; currentPublishedVersion: unknown }>) {
    if (module.currentPublishedVersion) continue;
    const bridgeCommand = { expectedRevision: module.draftRevision, idempotencyKey: randomUUID() };
    expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${module.id}/validate`, { data: bridgeCommand })).ok()).toBeTruthy();
    expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${module.id}/publish`, { data: { ...bridgeCommand, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
  }
  const response = await context.request.get('/api/v1/admin/ielts-band-curriculum');
  expect(response.ok()).toBeTruthy();
  const curriculum = await response.json() as { draftRevision: number };
  const command = { expectedRevision: curriculum.draftRevision, idempotencyKey: randomUUID() };
  expect((await context.request.post('/api/v1/admin/ielts-band-curriculum/validate', { data: command })).ok()).toBeTruthy();
  const published = await context.request.post('/api/v1/admin/ielts-band-curriculum/publish', { data: { ...command, idempotencyKey: randomUUID() } });
  expect(published.ok()).toBeTruthy();
  return ((await published.json()) as { version: number }).version;
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

test('Admin publishes seven stages and learner remains pinned to the started curriculum version', async ({ browser, page }) => {
  test.setTimeout(120_000);
  await page.goto('/login');
  const admin = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: page.viewportSize() ?? undefined });
  try {
    const firstVersion = await publishBandCurriculum(admin);
    const adminPage = await admin.newPage();
    await adminPage.goto('/admin/ielts-band-curriculum');
    await expect(adminPage.getByRole('heading', { level: 1, name: 'Band Curriculum' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: '8.0 to 9.0' })).toBeVisible();
    await expectNoHorizontalOverflow(adminPage);

    const registration = await page.request.post('/api/v1/auth/register', { data: { displayName: 'Band E2E Learner', email: `band-${randomUUID()}@test.local`, password: 'band-e2e-password' } });
    expect(registration.ok()).toBeTruthy();
    const learner = await registration.json() as { id: string };
    expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy();
    await grantBridgeCompletion(learner.id);
    await page.goto('/ielts/pathway');
    await page.getByLabel('Target IELTS band').selectOption('7');
    await page.getByRole('button', { name: 'Start band-oriented pathway' }).click();
    await expect(page.getByText('Target Band 7')).toBeVisible();
    await expect(page.getByText('Insufficient evidence')).toHaveCount(4);
    await expect(page.getByText(/estimated score/iu)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    const started = await (await page.request.get('/api/v1/me/ielts-band-pathway')).json() as { journey: { curriculumVersion: number } };
    expect(started.journey.curriculumVersion).toBe(firstVersion);

    const secondVersion = await publishBandCurriculum(admin);
    expect(secondVersion).toBe(firstVersion + 1);
    await page.reload();
    const resumed = await (await page.request.get('/api/v1/me/ielts-band-pathway')).json() as typeof started;
    expect(resumed.journey.curriculumVersion).toBe(firstVersion);
    await page.getByRole('button', { name: 'Evaluate progress' }).click();
    await expect(page.getByText('Complete at least 2 integrated sessions.')).toBeVisible();
  } finally { await admin.close(); }
});
