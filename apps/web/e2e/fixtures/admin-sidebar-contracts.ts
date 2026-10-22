import { expect, type Page } from '@playwright/test';
import { adminDashboardOverviewSchema, contentImportSchema, intermediateTopicGroupCatalogSchema, ieltsIntroductionSchema } from '@worklingo/contracts';
import { createIntermediateLessonDraft, serializeIntermediateLesson } from '../../src/features/admin-intermediate/lesson-model';
import { serializeIntermediateTopicLesson } from '../../src/features/admin-intermediate/topic-lesson-model';
import { installAuthoringFixtures, authoringFixtures, importId } from './phase4-authoring-contracts';
import { installLearningFixtures } from './phase4-learning-contracts';
import { shellUser } from './shell-contracts';

export const sidebarImportId = importId;
export const sidebarOverview = adminDashboardOverviewSchema.parse({
  totalLearners: 0, activeLearners7d: 0, programEnrollments: 0, sessionCompletionRate: null,
  programs: [
    { id: '10000000-0000-4000-8000-000000000002', slug: 'intermediate', name: 'Intermediate', availabilityStatus: 'AVAILABLE', enrollments: 0, publishedMissions: 0, completedSessions: 0, totalSessions: 0 },
    { id: '10000000-0000-4000-8000-000000000004', slug: 'ielts', name: 'IELTS', availabilityStatus: 'IN_DEVELOPMENT', enrollments: 0, publishedMissions: 0, completedSessions: 0, totalSessions: 0 },
  ], activity: [], recentActivity: [],
});

export async function sidebarUser(page: Page, locale: 'vi' | 'en', roles: string[] = ['CONTENT_ADMIN']) {
  await page.route('**/api/v1/me', route => route.fulfill({ json: { ...shellUser, locale, roles } }));
}

export async function installSidebarAdminFixtures(page: Page, locale: 'vi' | 'en' = 'en', pathname = '') {
  await installAuthoringFixtures(page, { locale });
  await sidebarUser(page, locale);
  await page.route('**/api/v1/admin/analytics/overview', route => route.fulfill({ json: sidebarOverview }));
  await page.route('**/api/v1/admin/ielts-topics', route => route.fulfill({ json: [] }));
  await page.route('**/api/v1/admin/intermediate-topic-groups', route => route.fulfill({
    json: intermediateTopicGroupCatalogSchema.parse({ groups: [{ id: importId, name: 'Sidebar QA topic', description: 'Presentation fixture', revision: 1, lessonCount: 0 }], lessons: [] }),
  }));
  await page.route('**/api/v1/admin/intermediate-topics/*/review', route => route.fulfill({
    json: { importId, revision: 0, status: 'none', proposal: null, approval: null },
  }));
  const topic = pathname.includes('/topics/');
  const draft = createIntermediateLessonDraft(topic ? 'reading' : 'grammar');
  draft.title = 'Sidebar QA lesson';
  const record = contentImportSchema.parse({ ...authoringFixtures.content,
    rawSource: topic ? serializeIntermediateTopicLesson(draft) : serializeIntermediateLesson('grammar', draft) });
  await page.route(`**/api/v1/admin/content-imports/${importId}`, route => route.request().method() === 'GET'
    ? route.fulfill({ json: record }) : route.fallback());
}

export async function installSidebarLearnerFixtures(page: Page, locale: 'vi' | 'en') {
  await installLearningFixtures(page); await sidebarUser(page, locale, ['LEARNER']);
  const section = { available: false, reason: 'CONTENT_UNAVAILABLE', resumeHref: null };
  await page.route('**/api/v1/me/ielts-overview', route => route.fulfill({ json: { flowVersion: 'v3', introduction: section, study: section, mock: section } }));
  await page.route('**/api/v1/me/ielts-history*', route => route.fulfill({ json: { items: [], nextCursor: null } }));
  await page.route('**/api/v1/me/ielts-study/topics', route => route.fulfill({ json: { topics: [], recommendations: [] } }));
  await page.route('**/api/v1/me/ielts-study/progress', route => route.fulfill({ json: {
    completedSessionCount: 0, practicedChunkCount: 0, masteredChunkCount: 0, pendingEvaluationCount: 0, dueReviewCount: 0, skills: [],
  } }));
  const introduction = ieltsIntroductionSchema.parse({
    presentation: { id: importId, orientationId: importId, version: 1, title: 'Introduction', slides: [
      { id: importId, slug: 'slide-0', title: 'What is IELTS?', body: 'QA fixture', transcript: 'QA fixture', audioUrl: null, imageUrl: null, question: null },
    ] },
    visit: { orientationVersionId: importId, lastSlideIndex: 0, revision: 1, visitedSlideIds: [importId], viewedAllAt: '2026-10-22T00:00:00Z' },
    currentPublishedVersionId: importId,
  });
  await page.route('**/api/v1/me/ielts-introduction*', route => route.fulfill({ json: introduction }));
}

export async function openSidebar(page: Page) {
  // Authenticated layout mounts after /me. Do not skip the mobile click just
  // because its button has not been attached when the document load resolves.
  await expect(page.locator('.workspace-navigation-admin')).toBeVisible();
  const toggle = page.locator('.workspace-navigation-toggle');
  if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  const nav = page.locator('.workspace-nav-admin'); await expect(nav).toBeVisible(); return nav;
}
