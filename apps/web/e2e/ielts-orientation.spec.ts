import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { ADMIN_CREDENTIALS, loginAsContentAdmin } from './helpers/content-admin';

interface E2EDatabase {
  mission: { findFirstOrThrow(input: unknown): Promise<{ id: string; lessons: Array<{ lesson: { currentPublishedVersionId: string | null } }> }> };
  learningSession: { create(input: unknown): Promise<{ id: string }> };
  checkpointAssessment: { create(input: unknown): Promise<unknown> };
  $disconnect(): Promise<void>;
}

async function grantFoundationEvidence(learnerId: string): Promise<void> {
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL;
  if (!datasourceUrl) throw new Error('WORKLINGO_E2E_DATABASE_URL is required.');
  const apiRequire = createRequire(path.resolve(__dirname, '../../api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => E2EDatabase };
  const database = new PrismaClient({ datasourceUrl });
  try {
    const mission = await database.mission.findFirstOrThrow({ where: { purpose: 'LEARNING' }, include: { lessons: { include: { lesson: true } } } });
    const lessonVersionId = mission.lessons[0]?.lesson.currentPublishedVersionId;
    if (!lessonVersionId) throw new Error('Foundation seed must publish a lesson version.');
    const session = await database.learningSession.create({ data: { learnerId, clientSessionId: randomUUID(), missionId: mission.id, lessonVersionId, durationMinutes: 60, planSnapshot: {} } });
    const skills = Object.fromEntries(['reading', 'listening', 'speaking', 'writing'].map((skill) => [skill, { score: 1, threshold: .8, passed: true, evaluatedCount: 1, pendingCount: 0 }]));
    await database.checkpointAssessment.create({ data: { learnerId, clientAssessmentId: randomUUID(), sessionId: session.id, lessonVersionId, levelCode: 'FOUNDATION_6', policyVersion: 'e2e-orientation', status: 'passed', skills, reinforcement: [], evidenceSnapshot: {}, canAdvance: true, nextLevelCode: 'IELTS_ORIENTATION' } });
  } finally { await database.$disconnect(); }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
}

async function publishNextVersion(context: BrowserContext, title: string): Promise<void> {
  const response = await context.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS });
  expect(response.ok()).toBeTruthy();
  const currentResponse = await context.request.get('/api/v1/admin/ielts-orientation');
  const current = await currentResponse.json();
  const update = await context.request.put('/api/v1/admin/ielts-orientation/draft', { data: { expectedRevision: current.draftRevision, content: { ...current.draft, title } } });
  expect(update.ok()).toBeTruthy();
  const updated = await update.json();
  expect((await context.request.post('/api/v1/admin/ielts-orientation/validate', { data: { expectedRevision: updated.draftRevision } })).ok()).toBeTruthy();
  expect((await context.request.post('/api/v1/admin/ielts-orientation/publish', { data: { expectedRevision: updated.draftRevision, idempotencyKey: randomUUID() } })).ok()).toBeTruthy();
}

test.describe('IELTS Orientation browser journey', () => {
  test('Admin publishes while learner remains locked, then resumes a pinned version after eligibility', async ({ browser, page }, testInfo) => {
    test.setTimeout(120_000);
    await loginAsContentAdmin(page);
    await page.goto('/admin/ielts-orientation');
    await expect(page.getByRole('heading', { level: 1, name: 'Orientation authoring' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const description = page.getByLabel('Course description');
    await description.fill(`${await description.inputValue()} ${testInfo.project.name}`);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();
    await page.getByRole('button', { name: 'Validate draft' }).click();
    await expect(page.getByText('Draft is ready to publish.')).toBeVisible();
    await page.getByRole('button', { name: 'Publish version' }).click();
    await expect(page.getByText(/Published version \d+\./u)).toBeVisible();

    await page.request.post('/api/v1/auth/logout');
    const registration = await page.request.post('/api/v1/auth/register', { data: { displayName: 'IELTS E2E Learner', email: `ielts-${randomUUID()}@test.local`, password: 'orientation-e2e-password' } });
    expect(registration.ok()).toBeTruthy();
    const learner = await registration.json() as { id: string };
    expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy();

    await page.goto('/dashboard');
    await expect(page.getByText('Complete your Foundation checkpoint to unlock IELTS Orientation.')).toBeVisible();
    await grantFoundationEvidence(learner.id);
    await page.reload();
    await page.getByRole('link', { name: 'Start IELTS Orientation' }).click();
    await page.getByRole('button', { name: 'Begin orientation' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome to IELTS' })).toBeVisible();
    const pinnedVersion = await page.getByText(/Version \d+/u).textContent();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'What is IELTS?' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'What is IELTS?' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const adminContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try { await publishNextVersion(adminContext, `Changed after learner start ${testInfo.project.name}`); }
    finally { await adminContext.close(); }
    await page.reload();
    await expect(page.getByText(pinnedVersion ?? 'Version 1')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'What is IELTS?' })).toBeVisible();
  });
});
