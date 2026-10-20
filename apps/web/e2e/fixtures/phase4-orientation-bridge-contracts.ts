import type { Page } from '@playwright/test';
import {
  authUserSchema, userPreferencesSchema, orientationLearnerStatusSchema, orientationProgressSchema,
  orientationProgressUpdateSchema, orientationProgressResultSchema,
  ieltsBridgeCatalogSchema, ieltsBridgeSessionSchema, ieltsBridgeProgressSchema,
  ieltsBridgeProgressUpdateSchema, ieltsBridgeProgressResultSchema,
  ieltsBridgeModuleContentSchema, ieltsBridgeStageTypes,
} from '@worklingo/contracts';
import { shellUser } from './shell-contracts';

export const moduleId = '11111111-1111-4111-8111-111111111111';
const bridgeVersionId = '22222222-2222-4222-8222-222222222222';
const orientationVersionId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-20T00:00:00.000Z';

export interface OrientationBridgeFixtureOptions {
  kind?: 'orientation' | 'bridge';
  state?: 'loaded' | 'locked' | 'empty' | 'error';
  locale?: 'vi' | 'en';
}
export interface OrientationBridgeFixtureRequest {
  method: string;
  url: string;
  body: string | null;
}

// Owner player-unit presentation, copied as data; never import a Vitest module.
const orientation = orientationLearnerStatusSchema.parse({
  state: 'in_progress', reasons: [],
  presentation: { id: orientationVersionId, orientationId: bridgeVersionId,
    title: 'IELTS Orientation', version: 1, slides: [
      { id: '33333333-3333-4333-8333-333333333333', slug: 'welcome', title: 'Welcome',
        body: 'Welcome body', transcript: 'Welcome transcript', imageUrl: null, audioUrl: null, question: null },
      { id: '44444444-4444-4444-8444-444444444444', slug: 'check', title: 'Knowledge check',
        body: 'Check body', transcript: 'Check transcript', imageUrl: null, audioUrl: null,
        question: { slug: 'skills-check', prompt: 'How many skills?', options: ['Two', 'Four'] } },
      { id: '55555555-5555-4555-8555-555555555555', slug: 'ready', title: 'Ready',
        body: 'Ready body', transcript: 'Ready transcript', imageUrl: null, audioUrl: null, question: null },
    ] },
  progress: { orientationVersionId, currentSlideIndex: 1, revision: 2, answers: [], completedAt: null },
});

// Owner Bridge player-unit IDs, ten stages, titles and timed choice; practice
// stages carry answerable authored tasks so the content schema is valid too.
const bridgeContent = ieltsBridgeModuleContentSchema.parse({
  title: 'Listening foundations', description: 'Description', skill: 'listening',
  questionType: 'listening_form_completion', required: true,
  stages: ieltsBridgeStageTypes.map((type, index) => {
    const practice = ['analysed_example', 'easy_practice', 'increased_practice',
      'independent_practice', 'timed_practice'].includes(type);
    return { slug: `stage-${index + 1}`, type, title: `Stage ${index + 1}`,
      instruction: `Instruction ${index + 1}`, strategySteps: [],
      timeLimitSeconds: type === 'timed_practice' ? 60 : null,
      task: practice ? { kind: 'single_choice', prompt: 'Choose the answer', options: ['A', 'B'], answerIndex: 0 }
        : { kind: 'instruction' },
      feedback: practice ? { correct: 'Correct answer.', incorrect: 'Review the example and strategy.' } : null };
  }),
});
const bridgeSession = ieltsBridgeSessionSchema.parse({
  module: { id: bridgeVersionId, moduleId, version: 1, title: bridgeContent.title,
    description: bridgeContent.description, skill: bridgeContent.skill, questionType: bridgeContent.questionType,
    stages: bridgeContent.stages.map((stage) => ({ ...stage, feedback: null,
      task: stage.task.kind === 'single_choice'
        ? { kind: stage.task.kind, prompt: stage.task.prompt, options: stage.task.options } : stage.task })),
  },
  progress: { moduleId, moduleVersionId: bridgeVersionId, currentStageIndex: 0, revision: 1,
    startedAt: timestamp, completedAt: null, timedStageStartedAt: null, timedStageDeadlineAt: null, stageResults: [] },
});

/**
 * Install before /ielts/orientation, /ielts/bridge or /ielts/bridge/:moduleId.
 * Returns isolated mutable data and raw request capture; keep the same installer
 * across reloads to resume. Set data.orientation to available/null progress to
 * exercise Begin. loaded resumes the owner-unit knowledge check (slide 2).
 * kind scopes state to the chosen surface; Bridge starts with Orientation complete.
 * empty Orientation is the real NOT_PUBLISHED lock, never an invalid slide array;
 * empty Bridge has no modules and start/session return 404. error keeps /me usable.
 *
 * No credentials, backend, provider, narration/media, recording or hardware is
 * exercised. Admin publication/version replacement, downstream dashboard and full
 * multi-choice/text/spoken tasks and four-skill Bridge completion are unsupported.
 * Session progress is mutable; task content uses the fixed owner-derived choices.
 * A single required module cannot
 * satisfy bridgeCompleted. Unknown endpoints, module IDs and methods fall back.
 */
export async function installOrientationBridgeFixtures(page: Page, options: OrientationBridgeFixtureOptions = {}) {
  const kind = options.kind ?? 'orientation';
  const mode = options.state ?? 'loaded';
  const orientationLocked = kind === 'orientation' && (mode === 'locked' || mode === 'empty');
  const data = {
    mode,
    user: authUserSchema.parse({ ...shellUser, locale: options.locale ?? 'vi' }),
    orientation: orientationLearnerStatusSchema.parse(orientationLocked ? {
      state: 'locked', reasons: [mode === 'empty' ? 'ORIENTATION_NOT_PUBLISHED' : 'FOUNDATION_CHECKPOINT_REQUIRED'],
      presentation: null, progress: null,
    } : { ...orientation, ...(kind === 'bridge' && mode !== 'locked' ? {
      state: 'completed', progress: { ...orientation.progress, currentSlideIndex: 2,
        answers: [{ questionSlug: 'skills-check', selectedIndex: 1, correct: true, answeredAt: timestamp }], completedAt: timestamp },
    } : {}) }),
    catalog: ieltsBridgeCatalogSchema.parse({ eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [] }),
    session: ieltsBridgeSessionSchema.parse(bridgeSession),
    bridgeStarted: false,
  };
  const requests: OrientationBridgeFixtureRequest[] = [];
  const syncCatalog = () => {
    const eligible = data.orientation.state === 'completed';
    data.catalog = ieltsBridgeCatalogSchema.parse({
      eligible, lockedReason: eligible ? null : 'ORIENTATION_REQUIRED', bridgeCompleted: false,
      modules: (kind === 'bridge' && data.mode === 'empty') || (!eligible && !data.bridgeStarted) ? [] : [{
        moduleId, moduleVersionId: data.session.module.id, title: data.session.module.title,
        description: data.session.module.description, skill: data.session.module.skill,
        questionType: data.session.module.questionType, required: true,
        progress: data.bridgeStarted ? data.session.progress : null,
      }],
    });
  };
  syncCatalog();
  const orientationBase = '/me/ielts-orientation';
  const bridgeBase = `/me/ielts-bridge/modules/${moduleId}`;
  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/u, '');
    requests.push({ method, url: request.url(), body: request.postData() });
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const fail = (code: string, status = 422) => reply({ code, statusCode: status, message: code }, status);
    const body = (): unknown => { try { return request.postDataJSON(); } catch { return null; } };
    if (method === 'GET' && path === '/me') return reply(authUserSchema.parse(data.user));
    if (method === 'GET' && path === '/me/preferences') return reply(userPreferencesSchema.parse({ locale: data.user.locale }));
    if (method === 'PATCH' && path === '/me/preferences') {
      const parsed = userPreferencesSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      data.user = authUserSchema.parse({ ...data.user, locale: parsed.data.locale });
      return reply(parsed.data);
    }
    const orientationRead = method === 'GET' && path === orientationBase;
    const orientationStart = method === 'POST' && path === orientationBase + '/start';
    const orientationWrite = method === 'PUT' && path === orientationBase + '/progress';
    const catalogRead = method === 'GET' && path === '/me/ielts-bridge/catalog';
    const bridgeRead = method === 'GET' && path === bridgeBase + '/session';
    const bridgeStart = method === 'POST' && path === bridgeBase + '/start';
    const bridgeWrite = method === 'PUT' && path === bridgeBase + '/progress';
    if (!(orientationRead || orientationStart || orientationWrite || catalogRead || bridgeRead || bridgeStart || bridgeWrite)) return route.fallback();
    if (data.mode === 'error' && (kind === 'orientation' ? orientationRead || orientationStart || orientationWrite
      : catalogRead || bridgeRead || bridgeStart || bridgeWrite)) return fail('SERVICE_UNAVAILABLE', 503);
    if (orientationRead) return reply(orientationLearnerStatusSchema.parse(data.orientation));
    if (orientationStart) {
      if (data.orientation.progress) return reply(orientationLearnerStatusSchema.parse(data.orientation));
      if (data.orientation.state === 'locked') return reply({ code: 'ORIENTATION_LOCKED', reasons: data.orientation.reasons }, 409);
      data.orientation = orientationLearnerStatusSchema.parse({ ...orientation, progress: {
        ...orientation.progress, currentSlideIndex: 0, revision: 1,
      } });
      return reply(data.orientation);
    }
    if (orientationWrite) {
      const parsed = orientationProgressUpdateSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      const input = parsed.data;
      const { progress, presentation } = data.orientation;
      if (!progress || !presentation || input.orientationVersionId !== progress.orientationVersionId) return fail('NOT_FOUND', 404);
      if (progress.completedAt) return fail('ORIENTATION_ALREADY_COMPLETED', 409);
      if (input.expectedRevision !== progress.revision) return fail('ORIENTATION_REVISION_STALE', 409);
      const last = presentation.slides.length - 1;
      if (input.targetSlideIndex > Math.min(progress.currentSlideIndex + 1, last)) return fail('ORIENTATION_SLIDE_LOCKED');
      const question = presentation.slides[progress.currentSlideIndex]?.question;
      let target = input.targetSlideIndex;
      let answers = progress.answers;
      let answerFeedback = null;
      if (target > progress.currentSlideIndex && question) {
        if (!input.answer || input.answer.questionSlug !== question.slug) return fail('ORIENTATION_ANSWER_REQUIRED');
        if (input.answer.selectedIndex >= question.options.length) return fail('ORIENTATION_ANSWER_INVALID');
        const correct = input.answer.selectedIndex === 1;
        answers = [...answers.filter((answer) => answer.questionSlug !== question.slug),
          { questionSlug: question.slug, selectedIndex: input.answer.selectedIndex, correct, answeredAt: new Date().toISOString() }];
        answerFeedback = { questionSlug: question.slug, correct, explanation: 'Four skills.' };
        if (!correct) target = progress.currentSlideIndex;
      } else if (input.answer) return fail('ORIENTATION_ANSWER_UNEXPECTED');
      if (input.complete && (progress.currentSlideIndex !== last || target !== last ||
        presentation.slides.some((slide) => slide.question && !answers.some((answer) => answer.questionSlug === slide.question?.slug && answer.correct)))) {
        return fail('ORIENTATION_COMPLETION_REQUIREMENTS_NOT_MET');
      }
      const result = orientationProgressResultSchema.parse({ progress: orientationProgressSchema.parse({
        ...progress, currentSlideIndex: target, revision: progress.revision + 1, answers,
        completedAt: input.complete ? new Date().toISOString() : null,
      }), answerFeedback });
      data.orientation = orientationLearnerStatusSchema.parse({ ...data.orientation,
        state: result.progress.completedAt ? 'completed' : 'in_progress', progress: result.progress });
      syncCatalog();
      return reply(result);
    }
    if (catalogRead) { syncCatalog(); return reply(data.catalog); }
    if (bridgeStart && !data.bridgeStarted) {
      if (data.orientation.state !== 'completed') return reply({ code: 'IELTS_BRIDGE_LOCKED', reason: 'ORIENTATION_REQUIRED' }, 409);
      if (kind === 'bridge' && data.mode === 'empty') return fail('NOT_FOUND', 404);
      data.bridgeStarted = true;
      syncCatalog();
    }
    if (!data.bridgeStarted) return fail('NOT_FOUND', 404);
    if (bridgeRead || bridgeStart) return reply(ieltsBridgeSessionSchema.parse(data.session));
    const parsed = ieltsBridgeProgressUpdateSchema.safeParse(body());
    if (!parsed.success) return fail('VALIDATION_ERROR', 400);
    const input = parsed.data;
    const progress = data.session.progress;
    if (progress.completedAt) return fail('IELTS_BRIDGE_ALREADY_COMPLETED', 409);
    if (input.expectedRevision !== progress.revision) return fail('IELTS_BRIDGE_REVISION_STALE', 409);
    if (input.stageIndex !== progress.currentStageIndex) return fail('IELTS_BRIDGE_STAGE_LOCKED');
    const stage = bridgeContent.stages[input.stageIndex];
    if (!stage) return fail('IELTS_BRIDGE_STAGE_INVALID');
    const now = new Date();
    if (input.startTimer) {
      if (stage.type !== 'timed_practice' || stage.timeLimitSeconds === null || input.completeStage) return fail('IELTS_BRIDGE_TIMER_INVALID');
      if (progress.timedStageStartedAt) return fail('IELTS_BRIDGE_TIMER_ALREADY_STARTED', 409);
      data.session.progress = ieltsBridgeProgressSchema.parse({ ...progress, revision: progress.revision + 1,
        timedStageStartedAt: now.toISOString(), timedStageDeadlineAt: new Date(now.getTime() + stage.timeLimitSeconds * 1000).toISOString() });
      syncCatalog();
      return reply(ieltsBridgeProgressResultSchema.parse({ progress: data.session.progress, feedbackMessage: null }));
    }
    if (!input.completeStage) return fail('IELTS_BRIDGE_STAGE_ACTION_REQUIRED');
    if (stage.type === 'timed_practice' && !progress.timedStageStartedAt) return fail('IELTS_BRIDGE_TIMER_REQUIRED');
    if (progress.stageResults.some((result) => result.stageSlug === stage.slug)) return fail('IELTS_BRIDGE_STAGE_ALREADY_SUBMITTED', 409);
    const task = stage.task;
    let correct: boolean | null = null;
    if (task.kind === 'instruction') {
      if (input.answer !== undefined) return fail('IELTS_BRIDGE_ANSWER_UNEXPECTED');
    } else {
      if (input.answer === undefined) return fail('IELTS_BRIDGE_ANSWER_REQUIRED');
      if (task.kind !== 'single_choice') return fail('FIXTURE_TASK_UNSUPPORTED', 501);
      if (typeof input.answer !== 'number' || !Number.isInteger(input.answer) || input.answer < 0 || input.answer >= task.options.length) return fail('IELTS_BRIDGE_ANSWER_INVALID');
      correct = input.answer === task.answerIndex;
    }
    data.session.progress = ieltsBridgeProgressSchema.parse({ ...progress, revision: progress.revision + 1,
      currentStageIndex: Math.min(input.stageIndex + 1, 9), completedAt: input.stageIndex === 9 ? now.toISOString() : null,
      stageResults: [...progress.stageResults, { stageSlug: stage.slug, correct,
        timedOut: stage.type === 'timed_practice' && !!progress.timedStageDeadlineAt && now.getTime() > Date.parse(progress.timedStageDeadlineAt),
        submittedAt: now.toISOString() }],
    });
    syncCatalog();
    return reply(ieltsBridgeProgressResultSchema.parse({ progress: data.session.progress,
      feedbackMessage: stage.feedback ? (correct === false ? stage.feedback.incorrect : stage.feedback.correct) : null }));
  });
  return { data, requests };
}
