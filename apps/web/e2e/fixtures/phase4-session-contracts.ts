import type { Page } from '@playwright/test';
import {
  authUserSchema, createPlacementAttemptInputSchema, evaluationDtoSchema,
  onboardingStateSchema, placementAttemptSchema, selfPlacementInputSchema,
  writingDraftSchema, audioSettingsSchema, type LearningSkill, type WritingDraft,
} from '@worklingo/contracts';
import { z } from 'zod';
import {
  activityAttemptDtoSchema, learnerActivityDtoSchema, learningSessionDtoSchema,
} from '../../src/lib/api/api-client';
import { shellUser } from './shell-contracts';

export const sessionId = z.uuid().parse('a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d');
export const placementAttemptId = z.uuid().parse('00000000-0000-4000-8000-000000000071');
export type SessionFixtureOptions = {
  kind?: 'onboarding' | 'placement' | 'session';
  skill?: LearningSkill;
  state?: 'loaded' | 'error' | 'empty';
};
export interface SessionFixtureRequest {
  readonly method: string;
  readonly url: string;
  /** Raw request body only; no cookies, authorization headers or account data. */
  readonly body: string | null;
}
const timestamp = '2026-10-20T08:00:00.000Z';
const lessonVersionId = 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e';
const missionId = 'c3d4e5f6-a7b8-49c0-81e2-3a4b5c6d7e8f';
const ids = {
  activate: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  reading: 'd4e5f6a7-b8c9-4d1e-8f3a-4b5c6d7e8f90',
  listening: 'f6a7b8c9-d0e1-4f3a-8b5c-6d7e8f90a1b2',
  speaking: '07a8b9c0-d1e2-4f4a-8b6c-7d8e9f0a1b2c',
  writing: '18b9c0d1-e2f3-4a5b-8c7d-8e9f0a1b2c3d',
};

// Content from session-shell.test.tsx; UUIDs normalized for the actual plan schema.
// No imports from test modules, and no microphone/audio/evaluator certification.
const reading = learnerActivityDtoSchema.parse({
  id: ids.reading, slug: 'read-email', activityType: 'reading',
  learningBlock: 'readDecode', skills: ['reading'], foundationCategory: 'grammar',
  content: [{ slug: 'intro-email', type: 'email',
    text: 'Subject: Team introduction\nDear team, I am eager to start.' }],
  languageBlocks: [{ slug: 'eager-to', canonicalForm: 'eager to',
    meaning: 'háo hức làm gì', grammarPattern: 'be + eager + to + base verb',
    examples: ['I am eager to start.'], commonErrors: ['I eager to start. → I am eager to start.'] }],
  payload: { prompt: 'Read the email and answer all questions.',
    questions: [{ slug: 'q1', prompt: 'What is the topic of the email?',
      options: ['Project status', 'Team introduction'] }] },
});
const activities = {
  activate: learnerActivityDtoSchema.parse({ ...reading, id: ids.activate,
    slug: 'activate-email', learningBlock: 'activate' }),
  reading,
  listening: learnerActivityDtoSchema.parse({
    id: ids.listening, slug: 'listen-dialogue', activityType: 'listening',
    learningBlock: 'listenReason', skills: ['listening'],
    content: [{ slug: 'audio-placeholder', type: 'audio_transcript',
      text: '[Audio placeholder]: "Hi, welcome to the engineering team."' }],
    languageBlocks: [],
    payload: { prompt: 'Listen to the greeting and choose the correct department.',
      questions: [{ slug: 'dept', prompt: 'Which department was mentioned?',
        options: ['Engineering', 'Marketing'] }] },
  }),
  speaking: learnerActivityDtoSchema.parse({
    id: ids.speaking, slug: 'speak-greeting', activityType: 'speaking',
    learningBlock: 'respond', skills: ['speaking'], content: [], languageBlocks: [],
    payload: { prompt: 'Say your name and department clearly.' },
  }),
  writing: learnerActivityDtoSchema.parse({
    id: ids.writing, slug: 'write-reply', activityType: 'writing',
    learningBlock: 'respond', skills: ['writing'], content: [], languageBlocks: [],
    payload: { prompt: 'Write a short greeting to your new teammate.',
      rubric: 'Clear greeting, friendly tone.' },
  }),
};
const planBlocks = [
  { type: 'activate', order: 1, targetMinutes: 15, activityIds: [ids.activate], skills: ['reading'] },
  { type: 'readDecode', order: 2, targetMinutes: 15, activityIds: [ids.reading], skills: ['reading'] },
  { type: 'listenReason', order: 3, targetMinutes: 15, activityIds: [ids.listening], skills: ['listening'] },
  { type: 'respond', order: 4, targetMinutes: 15,
    activityIds: [ids.speaking, ids.writing], skills: ['speaking', 'writing'] },
];
const session = learningSessionDtoSchema.parse({
  id: sessionId, clientSessionId: 'f1e2d3c4-b5a6-4980-8234-56789abcdef0',
  lessonVersionId, purpose: 'learning', durationMinutes: 60, status: 'in_progress',
  currentCheckpoint: 1, mission: { id: missionId, title: 'Introduce yourself to a new colleague' },
  plan: { durationMinutes: 60, missionId, lessonVersionId, blocks: planBlocks },
  blocks: planBlocks.map((block) => ({
    id: 'block-' + block.order, type: block.type, order: block.order,
    targetMinutes: block.targetMinutes, activityIds: block.activityIds,
    status: block.order === 1 ? 'completed' : 'available',
  })),
  attempts: [],
});
// OnboardingWorkspace's pendingState, with the same available/unavailable levels.
const onboarding = onboardingStateSchema.parse({
  activePlacementAttempt: null, currentLevelCode: null,
  eligibleLevels: [
    { available: true, cefrReference: 'Foundation', code: 'FOUNDATION_1', name: 'Foundation 1',
      reason: 'A complete four-skill workplace mission is available.' },
    { available: false, cefrReference: 'Foundation', code: 'FOUNDATION_2', name: 'Foundation 2',
      reason: 'Reviewed four-skill workplace content is not published yet.' },
  ],
  nextAction: 'choose_method', onboardingMethod: null, onboardingStatus: 'PENDING',
});
const pendingSkill = { evidenceCount: 0, score: null, status: 'pending' };
const placement = placementAttemptSchema.parse({
  id: placementAttemptId, clientAttemptId: '00000000-0000-4000-8000-000000000072',
  learningSessionId: sessionId, lessonVersionId, createdAt: timestamp, updatedAt: timestamp,
  confirmedAt: null, explanation: null, nextAction: 'continue_assessment',
  policyVersion: 'workplace-placement-v1', recommendedLevelCode: null,
  retryableAttemptIds: [], status: 'IN_PROGRESS',
  skillResults: { reading: pendingSkill, listening: pendingSkill, speaking: pendingSkill, writing: pendingSkill },
});

/** All exported DTOs are parsed at module evaluation, including draft/evaluation examples. */
export const sessionFixtures = {
  user: authUserSchema.parse(shellUser),
  pendingUser: authUserSchema.parse({ ...shellUser, onboardingStatus: 'PENDING' }),
  onboarding, placement, session, activities,
  draft: writingDraftSchema.parse({
    sessionId, activityId: ids.writing, text: 'Hello teammate', revision: 1, updatedAt: timestamp,
  }),
  // Provider-free status shape from use-evaluation.test.tsx; never implies an AI score.
  evaluation: evaluationDtoSchema.parse({
    attemptId: '00000000-0000-4000-8000-000000000073', status: 'processing',
    transcript: null, scores: null, score: null, feedback: null,
    retryable: false, recording: null, completedAt: null,
  }),
};

const saveDraftInput = z.object({
  expectedRevision: z.number().int().nonnegative(), text: z.string().max(20_000),
}).strict();
const attemptInput = z.object({
  clientAttemptId: z.uuid(), sessionId: z.uuid(), response: z.record(z.string(), z.unknown()),
}).strict();

/**
 * Install before navigation to /onboarding, /onboarding/placement/:sessionId or
 * /sessions/:sessionId. skill selects the initial real checkpoint (default reading).
 * empty means no eligible onboarding levels, or a completed session with no attempts;
 * it is deliberately not an invalid empty four-skill plan. error fails owned data
 * requests with 503 while keeping /me authenticated. Mutable data is isolated per call.
 *
 * Unknown endpoints/methods fall back. There are no invented /answers or /submit APIs:
 * answers use /activities/:id/attempts and writing autosave uses .../draft.
 * Audio streams/uploads, mic consent, real evaluations, placement recommendation/
 * confirmation and downstream dashboard APIs are unsupported and fall back.
 */
export async function installSessionFixtures(page: Page, options: SessionFixtureOptions = {}) {
  const kind = options.kind ?? 'session';
  const mode = options.state ?? 'loaded';
  const skill = options.skill ?? 'reading';
  const checkpoint = { reading: 1, listening: 2, speaking: 3, writing: 4 }[skill];
  const data = {
    mode,
    user: authUserSchema.parse(kind === 'session' ? sessionFixtures.user : sessionFixtures.pendingUser),
    onboarding: onboardingStateSchema.parse({
      ...onboarding, ...(mode === 'empty' ? { eligibleLevels: [] } : {}),
      ...(kind === 'placement' ? {
        activePlacementAttempt: placement, nextAction: 'resume_placement', onboardingMethod: 'PLACEMENT',
      } : {}),
    }),
    placement: placementAttemptSchema.parse(placement),
    session: learningSessionDtoSchema.parse({
      ...session, purpose: kind === 'placement' ? 'placement' : 'learning',
      status: mode === 'empty' ? 'completed' : 'in_progress',
      currentCheckpoint: mode === 'empty' ? 5 : checkpoint,
      mission: { ...session.mission, title: kind === 'placement'
        ? 'Workplace Placement Assessment' : session.mission.title },
    }),
    activities: structuredClone(activities),
    drafts: {} as Record<string, WritingDraft>,
    evaluations: {} as Record<string, z.infer<typeof evaluationDtoSchema>>,
  };
  const requests: SessionFixtureRequest[] = [];
  const base = '/learning-sessions/' + sessionId;
  const activityList = () => Object.values(data.activities);
  const synchronizeBlocks = () => {
    let end = 0;
    data.session = learningSessionDtoSchema.parse({
      ...data.session,
      blocks: data.session.blocks.map((block) => {
        end += block.activityIds.length;
        return { ...block, status: end <= data.session.currentCheckpoint ? 'completed' : 'available' };
      }),
    });
  };
  synchronizeBlocks();
  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/u, '');
    requests.push({ method, url: request.url(), body: request.postData() });
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const fail = (code: string, status: number, message: string) => reply({ code, statusCode: status, message }, status);
    const unavailable = () => fail('SERVICE_UNAVAILABLE', 503, 'Fixture data temporarily unavailable');
    const body = (): unknown => {
      try { return request.postDataJSON(); } catch { return null; }
    };
    if (method === 'GET' && path === '/me') return reply(authUserSchema.parse(data.user));
    if (method === 'PATCH' && path === '/me/preferences') { const locale = z.object({ locale: z.enum(['vi', 'en']) }).parse(body()).locale; data.user = { ...data.user, locale }; return reply({ locale }); }
    if (method === 'GET' && path === '/me/audio-settings') return reply(audioSettingsSchema.parse({ sourceId: 'published-audio', browserVoiceId: null }));
    if (method === 'GET' && path.endsWith('/audio')) {
      // Deterministic mono WAV, native HTMLMediaElement playback; no provider claim.
      const wav = Buffer.alloc(44 + 16000); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
      for (let i = 0; i < 8000; i++) wav.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 220 / 8000) * 1000), 44 + i * 2);
      return route.fulfill({ contentType: 'audio/wav', body: wav });
    }
    const activity = activityList().find((item) => path === base + '/activities/' + item.id ||
      path === base + '/activities/' + item.id + '/draft' || path === '/activities/' + item.id + '/attempts');
    const draftPath = activity && path === base + '/activities/' + activity.id + '/draft';
    const evaluationId = Object.keys(data.evaluations).find((id) => path === '/attempts/' + id + '/evaluation');
    const read = method === 'GET' && (
      path === '/me/onboarding' || path === base ||
      path === '/me/onboarding/placement-attempts/' + data.placement.id ||
      (activity && (draftPath || path === base + '/activities/' + activity.id)) || evaluationId
    );
    const write = (method === 'POST' && (
      path === '/me/onboarding/self-placement' || path === '/me/onboarding/placement-attempts' ||
      [base + '/start', base + '/pause', base + '/resume'].includes(path) ||
      (activity && path === '/activities/' + activity.id + '/attempts')
    )) || (method === 'PUT' && draftPath);
    if (!read && !write) return route.fallback();
    if (data.mode === 'error') return unavailable();

    if (method === 'GET') {
      if (path === '/me/onboarding') return reply(onboardingStateSchema.parse(data.onboarding));
      if (path === '/me/onboarding/placement-attempts/' + data.placement.id) return reply(placementAttemptSchema.parse(data.placement));
      if (path === base) return reply(learningSessionDtoSchema.parse(data.session));
      if (evaluationId) return reply(evaluationDtoSchema.parse(data.evaluations[evaluationId]));
      if (activity) return reply(draftPath
        ? writingDraftSchema.nullable().parse(data.drafts[activity.id] ?? null)
        : learnerActivityDtoSchema.parse(activity));
    }
    if (path === '/me/onboarding/self-placement') {
      const parsed = selfPlacementInputSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400, 'Invalid self-placement request');
      if (!data.onboarding.eligibleLevels.some((level) => level.code === parsed.data.selectedLevelCode && level.available)) {
        return fail('LEVEL_NOT_PLAYABLE', 422, 'Selected level is not available');
      }
      data.onboarding = onboardingStateSchema.parse({
        ...data.onboarding, currentLevelCode: parsed.data.selectedLevelCode,
        onboardingStatus: 'COMPLETE', onboardingMethod: 'SELF_SELECTED', nextAction: 'open_dashboard',
      });
      data.user = authUserSchema.parse({ ...data.user, onboardingStatus: 'COMPLETE' });
      return reply(data.onboarding);
    }
    if (path === '/me/onboarding/placement-attempts') {
      const parsed = createPlacementAttemptInputSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400, 'Invalid placement request');
      // Existing active placement is reused, including its original clientAttemptId.
      if (!data.onboarding.activePlacementAttempt) {
        data.placement = placementAttemptSchema.parse({ ...data.placement, clientAttemptId: parsed.data.clientAttemptId });
      }
      data.session = learningSessionDtoSchema.parse({ ...data.session, purpose: 'placement',
        mission: { ...data.session.mission, title: 'Workplace Placement Assessment' } });
      data.onboarding = onboardingStateSchema.parse({
        ...data.onboarding, activePlacementAttempt: data.placement,
        nextAction: 'resume_placement', onboardingMethod: 'PLACEMENT',
      });
      return reply(data.placement);
    }
    if ([base + '/start', base + '/pause', base + '/resume'].includes(path)) {
      if (data.session.status === 'completed') return fail('SESSION_NOT_ACTIVE', 409, 'Session is complete');
      data.session = learningSessionDtoSchema.parse({
        ...data.session, status: path.endsWith('/pause') ? 'paused' : 'in_progress',
      });
      return reply(data.session);
    }
    if (!activity) return route.fallback();
    if (draftPath) {
      if (activity.activityType !== 'writing') return fail('VALIDATION_ERROR', 400, 'Only writing activities have drafts');
      const parsed = saveDraftInput.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400, 'Invalid draft request');
      if (parsed.data.expectedRevision !== (data.drafts[activity.id]?.revision ?? 0)) {
        return reply({ code: 'DRAFT_REVISION_CONFLICT', statusCode: 409,
          currentRevision: data.drafts[activity.id]?.revision ?? 0,
          message: 'A newer draft revision already exists.' }, 409);
      }
      data.drafts[activity.id] = writingDraftSchema.parse({
        sessionId, activityId: activity.id, text: parsed.data.text.trim(),
        revision: parsed.data.expectedRevision + 1, updatedAt: timestamp,
      });
      return reply(data.drafts[activity.id]);
    }
    const parsed = attemptInput.safeParse(body());
    if (!parsed.success || parsed.data.sessionId !== sessionId) return fail('VALIDATION_ERROR', 400, 'Invalid activity attempt');
    const input = parsed.data;
    const prior = data.session.attempts.find((item) => item.clientAttemptId === input.clientAttemptId);
    if (prior) {
      if (prior.activityId !== activity.id || JSON.stringify(prior.rawResponse) !== JSON.stringify(input.response)) {
        return fail('IDEMPOTENCY_CONFLICT', 409, 'Attempt key already used for another response');
      }
      return reply(activityAttemptDtoSchema.parse(prior));
    }
    if (data.session.status !== 'in_progress') return fail('SESSION_NOT_ACTIVE', 409, 'Session is not active');
    const allIds = data.session.plan.blocks.flatMap((block) => block.activityIds);
    if (allIds[data.session.currentCheckpoint] !== activity.id) return fail('INVALID_CHECKPOINT', 409, 'Activity is not current');
    if (activity.activityType === 'speaking') return fail('RECORDING_REQUIRED', 422, 'Speaking requires a real recording');
    const comprehension = activity.activityType === 'reading' || activity.activityType === 'listening';
    const answers = z.object({ answerIndexes: z.array(z.number().int().min(0).max(1)).length(1) }).strict();
    if (comprehension ? !answers.safeParse(input.response).success
      : !z.object({ text: z.string().trim().min(1).max(20_000) }).strict().safeParse(input.response).success) {
      return fail('VALIDATION_ERROR', 400, 'Invalid activity response');
    }
    const passed = !comprehension ||
      (input.response.answerIndexes as number[])[0] === (activity.activityType === 'reading' ? 1 : 0);
    const attempt = activityAttemptDtoSchema.parse({
      id: input.clientAttemptId, clientAttemptId: input.clientAttemptId, learnerId: data.user.id,
      sessionId, activityId: activity.id, createdAt: timestamp, rawResponse: input.response,
      normalizedResponse: comprehension ? input.response : { text: (input.response.text as string).trim() },
      evaluationStatus: comprehension ? 'evaluated' : 'queued',
      score: comprehension ? (passed ? 1 : 0) : null,
      feedback: comprehension ? (passed ? 'Correct answer.' : 'Try again.') : null,
    });
    if (!comprehension) {
      delete data.drafts[activity.id];
      data.evaluations[attempt.id] = evaluationDtoSchema.parse({
        ...sessionFixtures.evaluation, attemptId: attempt.id,
      });
    }
    const next = data.session.currentCheckpoint + (passed ? 1 : 0);
    data.session = learningSessionDtoSchema.parse({
      ...data.session, attempts: [...data.session.attempts, attempt], currentCheckpoint: next,
      status: next >= allIds.length ? 'completed' : data.session.status,
    });
    synchronizeBlocks();
    return reply(attempt);
  });
  return { requests, data };
}
