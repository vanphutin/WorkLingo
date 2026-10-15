import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';

interface E2EDatabase {
  ieltsOrientationVersion: { findFirstOrThrow(input: unknown): Promise<{ id: string }> };
  orientationProgress: { create(input: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

async function grantCompletedOrientation(learnerId: string): Promise<void> {
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL;
  if (!datasourceUrl) throw new Error('WORKLINGO_E2E_DATABASE_URL is required.');
  const apiRequire = createRequire(path.resolve(__dirname, '../../api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => E2EDatabase };
  const database = new PrismaClient({ datasourceUrl });
  try {
    const version = await database.ieltsOrientationVersion.findFirstOrThrow({ where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' } });
    await database.orientationProgress.create({ data: { learnerId, orientationVersionId: version.id, currentSlideIndex: 0, revision: 1, answers: [], completedAt: new Date() } });
  } finally { await database.$disconnect(); }
}

async function ensureOrientationPublished(context: BrowserContext): Promise<void> {
  expect((await context.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).ok()).toBeTruthy();
  const currentResponse = await context.request.get('/api/v1/admin/ielts-orientation');
  expect(currentResponse.ok()).toBeTruthy();
  const current = await currentResponse.json();
  if (current.currentPublishedVersion) return;
  const command = { expectedRevision: current.draftRevision, idempotencyKey: randomUUID() };
  expect((await context.request.post('/api/v1/admin/ielts-orientation/validate', { data: command })).ok()).toBeTruthy();
  expect((await context.request.post('/api/v1/admin/ielts-orientation/publish', { data: { ...command, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
}

async function publishNewModuleVersion(context: BrowserContext, moduleId: string): Promise<void> {
  expect((await context.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).ok()).toBeTruthy();
  const currentResponse = await context.request.get(`/api/v1/admin/ielts-bridge/modules/${moduleId}`);
  expect(currentResponse.ok()).toBeTruthy();
  const current = await currentResponse.json();
  const savedResponse = await context.request.put(`/api/v1/admin/ielts-bridge/modules/${moduleId}/draft`, { data: {
    expectedRevision: current.draftRevision, idempotencyKey: randomUUID(), content: { ...current.draft, description: `${current.draft.description} Updated after learner start.` },
  } });
  expect(savedResponse.ok()).toBeTruthy();
  const saved = await savedResponse.json();
  const command = { expectedRevision: saved.draftRevision, idempotencyKey: randomUUID() };
  expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${moduleId}/validate`, { data: command })).ok()).toBeTruthy();
  expect((await context.request.post(`/api/v1/admin/ielts-bridge/modules/${moduleId}/publish`, { data: { ...command, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
}

test('learner starts, resumes and remains pinned while Admin publishes a new Bridge version', async ({ browser, page }) => {
  test.setTimeout(120_000);
  await page.goto('/login');
  const setupContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try { await ensureOrientationPublished(setupContext); }
  finally { await setupContext.close(); }
  const registration = await page.request.post('/api/v1/auth/register', { data: { locale: 'en', displayName: 'Bridge E2E Learner', email: `bridge-${randomUUID()}@test.local`, password: 'bridge-e2e-password' } });
  expect(registration.ok()).toBeTruthy();
  const learner = await registration.json() as { id: string };
  expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy();
  await grantCompletedOrientation(learner.id);

  await page.goto('/ielts/bridge');
  await expect(page.getByRole('heading', { level: 1, name: 'IELTS Bridge' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('link', { name: 'Start module' }).first().click();
  await expect(page.getByText('Stage 1 of 10')).toBeVisible();
  const moduleId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  const startedResponse = await page.request.get(`/api/v1/me/ielts-bridge/modules/${moduleId}/session`);
  const started = await startedResponse.json() as { module: { id: string } };
  await page.getByRole('button', { name: 'Complete stage' }).click();
  await expect(page.getByText('Stage 2 of 10')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Stage 2 of 10')).toBeVisible();

  const adminContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try { await publishNewModuleVersion(adminContext, moduleId); }
  finally { await adminContext.close(); }
  const resumedResponse = await page.request.get(`/api/v1/me/ielts-bridge/modules/${moduleId}/session`);
  const resumed = await resumedResponse.json() as { module: { id: string } };
  expect(resumed.module.id).toBe(started.module.id);
  await page.reload();
  await expect(page.getByText('Stage 2 of 10')).toBeVisible();
});
