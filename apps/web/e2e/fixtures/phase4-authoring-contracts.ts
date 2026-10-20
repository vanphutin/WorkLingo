import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { analyzeLessonSource } from '@worklingo/content-format';
import {
  adminIeltsBandCurriculumSchema, adminIeltsBridgeModuleSchema, adminIeltsIntegratedProfileSchema,
  adminIeltsMockSchema, adminOrientationSchema, authUserSchema, contentImportSchema,
  createContentImportSchema, orientationValidationResultSchema, publishOrientationResultSchema,
  publishOrientationSchema, saveIeltsBandCurriculumDraftSchema, saveIeltsBridgeDraftSchema,
  saveIeltsIntegratedDraftSchema, saveIeltsMockDraftSchema, updateContentSourceSchema,
  updateLearningPathInputSchema, updateLevelInputSchema, updateMissionInputSchema,
  updateOrientationDraftSchema, validateContentImportResultSchema, validateContentImportSchema,
  validateOrientationDraftSchema, type ContentImportDto,
} from '@worklingo/contracts';
import { z } from 'zod';
import { contentPreviewDtoSchema } from '../../src/lib/api/api-client';
import { shellUser } from './shell-contracts';
import { authoringFixtures, authoringSourceHash, authoringTimestamp, importId } from './phase4-authoring-data';

export { authoringFixtures, importId } from './phase4-authoring-data';
export interface AuthoringFixtureOptions {
  readonly kind?: 'content' | 'curriculum' | 'orientation' | 'bridge' | 'integrated' | 'band' | 'mock';
  readonly state?: 'loaded' | 'empty' | 'error';
  readonly locale?: 'vi' | 'en';
  readonly role?: 'CONTENT_ADMIN' | 'SYSTEM_ADMIN';
}
export interface AuthoringFixtureRequest {
  readonly method: string;
  readonly url: string;
  /** Raw body only: no cookies or authorization headers. Includes fallback requests. */
  readonly body: string | null;
}

/**
 * Install before navigation to /admin/content, /admin/content/new,
 * /admin/content/:importId, /admin/curriculum, /admin/ielts-orientation,
 * /admin/ielts-bridge, /admin/ielts-integrated, /admin/ielts-band-curriculum,
 * or /admin/ielts-mocks. All seven owners are loaded; kind scopes empty/error.
 *
 * Fixture simulation only. These routes still run their real UI and API clients.
 * Empty removes list records (curriculum retains its program choices). A missing
 * content detail returns 404. Singleton orientation/band have no empty DTO/UI
 * contract: requesting empty for either throws before installing interception.
 * /admin/content/new has no owned initial data GET, so empty/error cannot give
 * its form an initial empty/error state. /me remains authenticated in error mode.
 *
 * Supports content creation/autosave/real parser validation/preview, curriculum
 * path/level/mission PATCH, five IELTS draft saves, and orientation validation/
 * publication. Save invalidates validation; stale revisions return owner 409s.
 * Orientation publish revalidates, like its owner, without requiring a prior
 * Validate click. No uploaded media are owned by this fixture installation.
 *
 * Unsupported: content audio generation/playback/publication/archive; curriculum
 * create/reorder/archive/publish/foundation editors; bridge creation/archive/
 * validation/publish; integrated/band/mock validation/publish; teacher review;
 * later cursor pages, mutation receipts/retry idempotency, concurrent writers,
 * permission-denial journeys, logout, and downstream learner APIs. Unknown IDs,
 * endpoints, methods and unsupported journeys fall back to the next handler.
 * Role selects /me only, not a simulated security policy. No product logic changes.
 */
export async function installAuthoringFixtures(page: Page, options: AuthoringFixtureOptions = {}) {
  const kind = options.kind ?? 'content';
  const mode = options.state ?? 'loaded';
  if (mode === 'empty' && (kind === 'orientation' || kind === 'band')) {
    throw new Error(`Unsupported empty state for singleton ${kind}; use loaded or error.`);
  }
  const data = {
    ...structuredClone(authoringFixtures), mode,
    user: authUserSchema.parse({ ...shellUser, locale: options.locale ?? 'vi', roles: [options.role ?? 'CONTENT_ADMIN'] }),
    contentExists: !(kind === 'content' && mode === 'empty'),
    createdImports: [] as ContentImportDto[],
    bridgeExists: !(kind === 'bridge' && mode === 'empty'),
    mockExists: !(kind === 'mock' && mode === 'empty'),
    pending: [{ id: '88888888-8888-4888-8888-888888888888', learnerId: shellUser.id,
      revision: 1, responses: { answer: 'My English response' }, submittedAt: authoringTimestamp,
      mockTestVersion: { version: 2 } }],
  };
  if (mode === 'empty' && kind === 'curriculum') data.curriculum.paths = [];
  if (mode === 'empty' && kind === 'integrated') data.integrated = [];
  if (mode === 'empty' && kind === 'mock') data.pending = [];
  const requests: AuthoringFixtureRequest[] = [];
  // Publication receipts are intentionally unsupported; snapshots remain detached.
  const orientationIssues = () => data.orientation.draft.slides.flatMap((slide, index) =>
    (['imageAssetId', 'audioAssetId'] as const).flatMap((field) => slide[field] === null ? [] : [{
      code: 'MEDIA_NOT_OWNED', path: `slides.${index}.${field}`,
      message: 'Referenced media must belong to this IELTS orientation.',
    }]));

  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/u, '');
    requests.push({ method, url: request.url(), body: request.postData() });
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const fail = (code: string, status: number, message: string) => reply({ code, statusCode: status, message }, status);
    const unavailable = (owner: AuthoringFixtureOptions['kind']) => mode === 'error' && owner === kind;
    const error = () => fail('SERVICE_UNAVAILABLE', 503, 'Fixture data temporarily unavailable');
    const body = (): unknown => { try { return request.postDataJSON(); } catch { return null; } };
    const invalid = () => fail('BAD_REQUEST', 400, 'Invalid fixture request payload');
    const conflict = (code: string) => fail(code, 409, 'Draft revision mismatch');
    // These three admin owners use Nest's plain ConflictException, with no code.
    const stale = (message: string) => reply({ statusCode: 409, error: 'Conflict', message }, 409);
    if (method === 'GET' && path === '/me') return reply(authUserSchema.parse(data.user));
    if (method === 'PATCH' && path === '/me/preferences') {
      const parsed = z.object({ locale: z.enum(['vi', 'en']) }).strict().safeParse(body());
      if (!parsed.success) return invalid();
      data.user.locale = parsed.data.locale;
      return reply(parsed.data);
    }
    if (path === '/admin/content-imports' && (method === 'GET' || method === 'POST')) {
      if (unavailable('content')) return error();
      if (method === 'GET') return reply([
        ...(data.contentExists ? [data.content] : []), ...data.createdImports,
      ].map((item) => contentImportSchema.parse(item)));
      const parsed = createContentImportSchema.safeParse(body());
      if (!parsed.success) return invalid();
      const created = contentImportSchema.parse({ ...authoringFixtures.content, id: randomUUID(),
        rawSource: parsed.data.rawSource, sourceHash: authoringSourceHash(parsed.data.rawSource),
        createdById: data.user.id, updatedById: data.user.id });
      data.createdImports.push(created);
      return reply(created, 201);
    }
    const content = [data.content, ...data.createdImports].find((item) =>
      path === `/admin/content-imports/${item.id}` ||
      ['preview', 'audio', 'source', 'validate'].some((action) => path === `/admin/content-imports/${item.id}/${action}`));
    const contentBase = `/admin/content-imports/${content?.id ?? importId}`;
    if ((method === 'GET' && [contentBase, `${contentBase}/preview`, `${contentBase}/audio`].includes(path)) ||
        (method === 'PATCH' && path === `${contentBase}/source`) ||
        (method === 'POST' && path === `${contentBase}/validate`)) {
      if (unavailable('content')) return error();
      if (!content || (content.id === importId && !data.contentExists)) return fail('NOT_FOUND', 404, 'Content import not found');
      if (path === contentBase) return reply(contentImportSchema.parse(content));
      if (path === `${contentBase}/audio`) return reply([]);
      if (method === 'PATCH') {
        const parsed = updateContentSourceSchema.safeParse(body());
        if (!parsed.success) return invalid();
        if (parsed.data.expectedDraftRevision !== content.draftRevision) return conflict('DRAFT_REVISION_CONFLICT');
        Object.assign(content, contentImportSchema.parse({ ...content, rawSource: parsed.data.rawSource,
          sourceHash: authoringSourceHash(parsed.data.rawSource), status: 'DRAFT', validationHash: null,
          draftRevision: content.draftRevision + 1, updatedById: data.user.id }));
        return reply(content);
      }
      if (method === 'POST') {
        const parsed = validateContentImportSchema.safeParse(body());
        if (!parsed.success) return invalid();
        if (parsed.data.expectedDraftRevision !== content.draftRevision) return conflict('DRAFT_REVISION_CONFLICT');
      }
      const analysis = analyzeLessonSource(content.rawSource);
      if (method === 'POST') {
        content.status = analysis.canPublish ? 'VALIDATED' : 'DRAFT';
        content.validationHash = analysis.canPublish ? content.sourceHash : null;
        return reply(validateContentImportResultSchema.parse({ importId: content.id, draftRevision: content.draftRevision,
          sourceHash: content.sourceHash, status: content.status, canPublish: analysis.canPublish,
          issues: analysis.issues, issuesTruncated: analysis.issuesTruncated }));
      }
      return reply(contentPreviewDtoSchema.parse({ importId: content.id, draftRevision: content.draftRevision,
        sourceHash: content.sourceHash, status: content.status, normalizedDraft: analysis.normalizedDraft,
        issues: analysis.issues, canPublish: analysis.canPublish }));
    }
    if (method === 'GET' && path === '/admin/curriculum') {
      if (unavailable('curriculum')) return error();
      return reply(data.curriculum);
    }
    if (method === 'PATCH') {
      const paths = data.curriculum.paths;
      const levels = paths.flatMap((item) => item.levels);
      const missions = levels.flatMap((item) => item.missions);
      const match = [...paths.map((item) => ({ item, endpoint: `/admin/curriculum/paths/${item.id}`, schema: updateLearningPathInputSchema })),
        ...levels.map((item) => ({ item, endpoint: `/admin/curriculum/levels/${item.id}`, schema: updateLevelInputSchema })),
        ...missions.map((item) => ({ item, endpoint: `/admin/curriculum/missions/${item.id}`, schema: updateMissionInputSchema }))]
        .find((candidate) => path === candidate.endpoint);
      if (match) {
        if (unavailable('curriculum')) return error();
        const parsed = match.schema.safeParse(body());
        if (!parsed.success) return invalid();
        if (parsed.data.expectedRevision !== match.item.revision) return conflict('CURRICULUM_REVISION_CONFLICT');
        const { expectedRevision, idempotencyKey, ...fields } = parsed.data;
        Object.assign(match.item, fields, { revision: expectedRevision + 1 });
        return reply(match.item);
      }
    }
    if (path === '/admin/ielts-orientation' && method === 'GET') {
      if (unavailable('orientation')) return error();
      return reply(adminOrientationSchema.parse(data.orientation));
    }
    if (path === '/admin/ielts-orientation/draft' && method === 'PUT') {
      if (unavailable('orientation')) return error();
      const parsed = updateOrientationDraftSchema.safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.expectedRevision !== data.orientation.draftRevision) return conflict('ORIENTATION_REVISION_STALE');
      data.orientation = adminOrientationSchema.parse({ ...data.orientation, draft: parsed.data.content,
        draftRevision: data.orientation.draftRevision + 1, status: 'DRAFT' });
      return reply(data.orientation);
    }
    if (method === 'POST' && ['/admin/ielts-orientation/validate', '/admin/ielts-orientation/publish'].includes(path)) {
      if (unavailable('orientation')) return error();
      const publishing = path.endsWith('/publish');
      const parsed = (publishing ? publishOrientationSchema : validateOrientationDraftSchema).safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.expectedRevision !== data.orientation.draftRevision) return conflict('ORIENTATION_REVISION_STALE');
      const issues = orientationIssues();
      if (!publishing) {
        data.orientation.status = issues.length ? 'DRAFT' : 'VALIDATED';
        return reply(orientationValidationResultSchema.parse({ draftRevision: data.orientation.draftRevision,
          status: data.orientation.status, canPublish: issues.length === 0, issues }));
      }
      if (issues.length) return reply({ code: 'ORIENTATION_VALIDATION_FAILED',
        message: 'Fix IELTS orientation validation issues before publishing.', details: issues }, 422);
      const version = { id: randomUUID(), version: data.orientation.versions.length + 1,
        publishedAt: authoringTimestamp, status: 'PUBLISHED' as const };
      data.orientation = adminOrientationSchema.parse({ ...data.orientation, status: 'PUBLISHED',
        currentPublishedVersion: version, versions: [version, ...data.orientation.versions.map((old) => ({ ...old, status: 'ARCHIVED' }))] });
      return reply(publishOrientationResultSchema.parse({ orientationId: data.orientation.id,
        orientationVersionId: version.id, version: version.version, publishedAt: version.publishedAt }));
    }
    const bridgeBase = `/admin/ielts-bridge/modules/${data.bridge.id}`;
    if (method === 'GET' && (path === '/admin/ielts-bridge/modules' || (data.bridgeExists && path === bridgeBase))) {
      if (unavailable('bridge')) return error();
      return reply(path === bridgeBase ? adminIeltsBridgeModuleSchema.parse(data.bridge) : data.bridgeExists ? [data.bridge] : []);
    }
    if (method === 'PUT' && data.bridgeExists && path === `${bridgeBase}/draft`) {
      if (unavailable('bridge')) return error();
      const parsed = saveIeltsBridgeDraftSchema.safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.expectedRevision !== data.bridge.draftRevision) return conflict('IELTS_BRIDGE_REVISION_STALE');
      data.bridge = adminIeltsBridgeModuleSchema.parse({ ...data.bridge, draft: parsed.data.content,
        draftRevision: data.bridge.draftRevision + 1, status: 'DRAFT' });
      return reply(data.bridge);
    }
    if (method === 'GET' && path === '/admin/ielts-integrated/profiles') {
      if (unavailable('integrated')) return error();
      return reply(data.integrated.map((item) => adminIeltsIntegratedProfileSchema.parse(item)));
    }
    const profileIndex = data.integrated.findIndex((item) => path === `/admin/ielts-integrated/profiles/${item.id}/draft`);
    const profile = data.integrated[profileIndex];
    if (method === 'PUT' && profile) {
      if (unavailable('integrated')) return error();
      const parsed = saveIeltsIntegratedDraftSchema.safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.content.durationMinutes !== profile.durationMinutes) {
        return reply({ statusCode: 400, error: 'Bad Request', message: 'Profile duration cannot be changed.' }, 400);
      }
      if (parsed.data.expectedRevision !== profile.draftRevision) return stale('IELTS integrated profile revision is stale.');
      data.integrated[profileIndex] = adminIeltsIntegratedProfileSchema.parse({ ...profile,
        draft: parsed.data.content, draftRevision: profile.draftRevision + 1, status: 'DRAFT' });
      return reply(data.integrated[profileIndex]);
    }
    if (method === 'GET' && path === '/admin/ielts-band-curriculum') {
      if (unavailable('band')) return error();
      return reply(adminIeltsBandCurriculumSchema.parse(data.band));
    }
    if (method === 'PUT' && path === '/admin/ielts-band-curriculum/draft') {
      if (unavailable('band')) return error();
      const parsed = saveIeltsBandCurriculumDraftSchema.safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.expectedRevision !== data.band.draftRevision) return stale('IELTS band curriculum revision is stale.');
      data.band = adminIeltsBandCurriculumSchema.parse({ ...data.band, draft: parsed.data.content,
        draftRevision: data.band.draftRevision + 1, status: 'DRAFT' });
      return reply(data.band);
    }
    if (method === 'GET' && (path === '/admin/ielts-mocks' || path === '/admin/ielts-mock-attempts')) {
      if (url.searchParams.has('cursor')) return route.fallback();
      if (unavailable('mock')) return error();
      return reply({ items: path === '/admin/ielts-mocks' ? data.mockExists ? [adminIeltsMockSchema.parse(data.mock)] : [] : data.pending, nextCursor: null });
    }
    if (method === 'PUT' && data.mockExists && path === `/admin/ielts-mocks/${data.mock.id}/draft`) {
      if (unavailable('mock')) return error();
      const parsed = saveIeltsMockDraftSchema.safeParse(body());
      if (!parsed.success) return invalid();
      if (parsed.data.expectedRevision !== data.mock.draftRevision) return stale('IELTS mock revision is stale.');
      data.mock = adminIeltsMockSchema.parse({ ...data.mock, draft: parsed.data.content,
        draftRevision: data.mock.draftRevision + 1, status: 'DRAFT' });
      return reply(data.mock);
    }
    return route.fallback();
  });
  return { data, requests };
}
