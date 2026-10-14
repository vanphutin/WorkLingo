import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { INITIAL_IELTS_ACADEMIC_MOCK, INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
import { expect, test, type Page } from '@playwright/test';

interface E2EDatabase {
  ieltsBandCurriculum: { create(input: unknown): Promise<{ id: string }> };
  ieltsBandCurriculumVersion: { create(input: unknown): Promise<{ id: string }> };
  ieltsBandJourney: { create(input: unknown): Promise<unknown> };
  ieltsMockTest: { create(input: unknown): Promise<{ id: string }>; update(input: unknown): Promise<unknown> };
  ieltsMockTestVersion: { create(input: unknown): Promise<{ id: string }> };
  $disconnect(): Promise<void>;
}

async function seedJourneyAndMock(learnerId: string) {
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL; if (!datasourceUrl) throw new Error('WORKLINGO_E2E_DATABASE_URL is required.');
  const apiRequire = createRequire(path.resolve(__dirname, '../../api/package.json')); const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => E2EDatabase }; const database = new PrismaClient({ datasourceUrl });
  try {
    const curriculum = await database.ieltsBandCurriculum.create({ data: { slug: `e2e-path-${randomUUID()}`, draftContent: INITIAL_IELTS_BAND_CURRICULUM } }); const curriculumVersion = await database.ieltsBandCurriculumVersion.create({ data: { curriculumId: curriculum.id, version: 1, sourceHash: 'e2e-band', content: INITIAL_IELTS_BAND_CURRICULUM } }); await database.ieltsBandJourney.create({ data: { learnerId, clientJourneyId: randomUUID(), curriculumVersionId: curriculumVersion.id, currentStageCode: INITIAL_IELTS_BAND_CURRICULUM.stages[0]!.code, targetBand: 7 } });
    const audioIds = Array.from({ length: 4 }, () => randomUUID()); const title = `E2E Full Mock ${randomUUID().slice(0, 8)}`; const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, title, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => ({ ...part, audioAssetId: audioIds[index]! })) } }; const mock = await database.ieltsMockTest.create({ data: { slug: `e2e-mock-${randomUUID()}`, status: 'PUBLISHED', draftContent: content } }); const version = await database.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 1, sourceHash: 'e2e-v1', content } }); await database.ieltsMockTest.update({ where: { id: mock.id }, data: { currentPublishedVersionId: version.id } }); return { database, mockId: mock.id, versionId: version.id, content, title };
  } catch (error) { await database.$disconnect(); throw error; }
}

async function expectNoHorizontalOverflow(page: Page) { const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); expect(size.scroll).toBeLessThanOrEqual(size.client + 1); }

test('learner starts and resumes the pinned full mock version', async ({ page }) => {
  const registration = await page.request.post('/api/v1/auth/register', { data: { displayName: 'Full Mock E2E', email: `full-mock-${randomUUID()}@test.local`, password: 'full-mock-e2e-password' } }); expect(registration.ok()).toBeTruthy(); const learner = await registration.json() as { id: string }; expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy(); const seeded = await seedJourneyAndMock(learner.id);
  try {
    await page.goto('/ielts/mock-tests'); await expect(page.getByRole('heading', { level: 1, name: 'Full Mock Tests' })).toBeVisible(); await expectNoHorizontalOverflow(page); await page.getByRole('heading', { name: seeded.title }).locator('..').getByRole('button', { name: 'Start full mock' }).click(); await expect(page.getByText('Version 1 · EXAM SIMULATION')).toBeVisible(); const attemptId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
    const version2 = await seeded.database.ieltsMockTestVersion.create({ data: { mockTestId: seeded.mockId, version: 2, sourceHash: 'e2e-v2', content: seeded.content } }); await seeded.database.ieltsMockTest.update({ where: { id: seeded.mockId }, data: { currentPublishedVersionId: version2.id } }); await page.reload(); await expect(page.getByText('Version 1 · EXAM SIMULATION')).toBeVisible(); const resumed = await (await page.request.get(`/api/v1/me/ielts-mock-attempts/${attemptId}`)).json() as { mockTestVersionId: string }; expect(resumed.mockTestVersionId).toBe(seeded.versionId); await expectNoHorizontalOverflow(page);
  } finally { await seeded.database.$disconnect(); }
});
