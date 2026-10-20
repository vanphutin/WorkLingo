import type { Page } from '@playwright/test';
import {
  authUserSchema, userPreferencesSchema, INITIAL_IELTS_INTEGRATED_PROFILES,
  INITIAL_IELTS_ACADEMIC_MOCK,
  ieltsIntegratedAvailabilitySchema, ieltsIntegratedSessionSchema,
  ieltsIntegratedProgressResultSchema, startIeltsIntegratedSessionSchema,
  updateIeltsIntegratedProgressSchema, ieltsBandPathwayAvailabilitySchema,
  ieltsBandPathwaySchema, startIeltsBandPathwaySchema, updateIeltsBandTargetSchema,
  evaluateIeltsBandPathwaySchema, ieltsMockCatalogSchema, ieltsMockAttemptSchema,
  ieltsMockReportSchema, startIeltsMockAttemptSchema, saveIeltsMockResponsesSchema,
  submitIeltsMockSectionSchema,
} from '@worklingo/contracts';
import { attemptId, questionId, shellAttempt, shellUser } from './shell-contracts';

export { attemptId, questionId };
export const sessionId = '44444444-4444-4444-8444-444444444444';
export const journeyId = '55555555-5555-4555-8555-555555555555';
export const mockTestId = '66666666-6666-4666-8666-666666666666';
export const profileVersionId = '77777777-7777-4777-8777-777777777777';
export const curriculumVersionId = '88888888-8888-4888-8888-888888888888';
const skills = ['listening', 'reading', 'writing', 'speaking'] as const;
const questionTypes = ['listening_form_completion', 'reading_matching_headings', 'writing_task_2', 'speaking_part_2_cue_card'] as const;
const sections = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const;
type Section = typeof sections[number];
const minutes: Record<Section, number> = { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 14 };

export interface ExamFixtureOptions {
  kind?: 'integrated' | 'pathway' | 'mock';
  state?: 'loaded' | 'locked' | 'empty' | 'error';
  locale?: 'vi' | 'en';
}
export interface ExamFixtureRequest { method: string; url: string; body: string | null }

// Owner unit data: integrated-practice.test.tsx's instruction blocks and
// ielts-band-pathway.test.tsx's insufficient-evidence journey. Never import tests.
function integratedSession(startedAt: string) {
  const blocks = skills.map((skill, index) => ({
    order: index + 1, skill, targetMinutes: [15, 15, 20, 10][index],
    moduleVersionId: `99999999-9999-4999-8999-${String(index + 1).padStart(12, '0')}`,
    questionType: questionTypes[index], mode: 'new_practice',
  }));
  return ieltsIntegratedSessionSchema.parse({
    id: sessionId, plan: { durationMinutes: 60, difficulty: 'foundation', profileVersionId, blocks },
    currentBlockIndex: 0, revision: 1, startedAt, completedAt: null,
    blocks: blocks.map((block, index) => ({ ...block,
      title: index === 0 ? 'Listen for detail' : ['Listen', 'Read', 'Write', 'Speak'][index],
      instruction: index === 0 ? 'Listen and identify the evidence.' : `${['Listen', 'Read', 'Write', 'Speak'][index]} carefully.`,
      task: { kind: 'instruction' }, startedAt: index === 0 ? startedAt : null,
      completedAt: null, correct: null, timedOut: null,
    })),
  });
}
function pathway(startedAt: string) {
  return ieltsBandPathwaySchema.parse({
    journeyId, curriculumVersionId, curriculumVersion: 1,
    currentStageCode: 'foundation_to_3', currentStageTitle: 'Foundation to 3.0', targetBand: 6,
    revision: 1, startedAt, completedAt: null,
    proficiency: skills.map((skill) => ({ skill, descriptor: 'insufficient_evidence', confidence: 'none', sampleCount: 0 })),
    practicePerformance: { completedSessions: 0, evaluatedBlocks: 0, recentCorrectRate: null },
    unmetCriteria: ['Complete at least 2 integrated sessions.'], remediation: [],
    recommendedPracticeFormats: ['Four-skill integrated session'], canAdvance: false,
  });
}

/**
 * Install once before navigating; retain the returned mutable data across reloads.
 * Routes: /ielts/practice, /ielts/practice/:sessionId, /ielts/pathway,
 * /ielts/mock-tests, /ielts/mock-tests/:attemptId. All need parent browser QA.
 * loaded seeds resumable owner-unit sessions; set availability.activeSessionId
 * or catalog.mocks[0].activeAttemptId to null to expose the launcher start action.
 * New client IDs become data.session.id / data.attempt.id, as on the real server.
 * kind scopes locked/empty/error to one surface; /me and preferences stay usable.
 * Direct players in locked/empty have no owned seed and return 404 (not a fake
 * player lock UI). Integrated empty is PROFILES_NOT_PUBLISHED, mock empty is
 * MOCK_NOT_PUBLISHED; neither owner has a separate published-empty backend state.
 * Pathway empty is eligible with no journey and supports Start.
 *
 * Unsupported journey map:
 * - Integrated: no draft-answer autosave endpoint exists; only completed blocks
 *   resume. Instruction tasks match unit data; choice/text scoring is not modeled.
 *   Expiry records timedOut on completion; the owner permits overtime submission.
 * - Pathway: evaluate preserves insufficient evidence; no synthetic stage advance,
 *   proficiency claims, or cross-session evidence aggregation.
 * - Mock: Reading uses shellAttempt, Writing/Speaking use published contract seed
 *   prompts. Fresh start uses published seed listening questions and owner-shaped
 *   audio URLs (null assets); audio endpoints fall back. Listening playback, play
 *   limits, and objective scoring are unsupported. Resume READING for media-free QA.
 *   Final submission returns a pending-review report with fixed fixture scores;
 *   no teacher review, official score, upload, microphone, or provider is simulated.
 * - Publication/version replacement has no learner GET endpoint; version IDs and
 *   numbers are pinned in returned DTOs. One session/attempt per installation;
 *   concurrent attempts and replaying older replaced starts are unsupported.
 *   Unknown IDs/endpoints/methods fall back.
 * Timers are server-owned fixture data: saves/reloads never extend a deadline.
 * For expiry, mutate startedAt (integrated block) or sectionDeadlineAt (mock)
 * before fetching; mock GET advances one expired section, like the owner service.
 */
export async function installExamFixtures(page: Page, options: ExamFixtureOptions = {}) {
  const kind = options.kind ?? 'integrated';
  const mode = options.state ?? 'loaded';
  const now = new Date().toISOString();
  const locked = (surface: ExamFixtureOptions['kind']) => kind === surface && mode === 'locked';
  const empty = (surface: ExamFixtureOptions['kind']) => kind === surface && mode === 'empty';
  const attempt = shellAttempt();
  const data = {
    mode,
    user: authUserSchema.parse({ ...shellUser, locale: options.locale ?? 'vi' }),
    session: integratedSession(now),
    availability: ieltsIntegratedAvailabilitySchema.parse({
      eligible: !locked('integrated') && !empty('integrated'),
      lockedReason: locked('integrated') ? 'BRIDGE_REQUIRED' : empty('integrated') ? 'PROFILES_NOT_PUBLISHED' : null,
      durations: locked('integrated') || empty('integrated') ? [] : [60, 90, 120, 150],
      difficulties: ['foundation', 'developing', 'competent', 'advanced'],
      activeSessionId: locked('integrated') || empty('integrated') ? null : sessionId,
    }),
    band: ieltsBandPathwayAvailabilitySchema.parse({ eligible: !locked('pathway'),
      lockedReason: locked('pathway') ? 'BRIDGE_REQUIRED' : null, targetBands: [3, 4, 5, 6, 7, 8, 9],
      journey: locked('pathway') || empty('pathway') ? null : pathway(now),
    }),
    attempt,
    catalog: ieltsMockCatalogSchema.parse({ eligible: !locked('mock') && !empty('mock'),
      lockedReason: locked('mock') ? 'BAND_PATHWAY_REQUIRED' : empty('mock') ? 'MOCK_NOT_PUBLISHED' : null,
      mocks: locked('mock') || empty('mock') ? [] : [{ id: mockTestId, title: attempt.title, variant: 'ACADEMIC',
        version: attempt.mockTestVersion, allowedModes: ['LEARNING', 'PRACTICE', 'EXAM_SIMULATION'], activeAttemptId: attemptId }],
    }),
    report: ieltsMockReportSchema.parse({ attemptId, status: 'EVALUATION_PENDING', scoringPolicyVersion: 1,
      disclosure: INITIAL_IELTS_ACADEMIC_MOCK.disclosure,
      skills: { listening: { status: 'SCORED', rawScore: 0, mockBand: 0 }, reading: { status: 'SCORED', rawScore: 0, mockBand: 0 },
        writing: { status: 'PENDING_EVALUATION', rawScore: null, mockBand: null }, speaking: { status: 'PENDING_EVALUATION', rawScore: null, mockBand: null } },
      overallMockBand: null, strengths: [], gaps: [], nextActions: ['Wait for teacher review of Writing and Speaking.'], completedAt: null,
    }),
    sessionExists: !locked('integrated') && !empty('integrated'),
    attemptExists: !locked('mock') && !empty('mock'),
  };
  const requests: ExamFixtureRequest[] = [];
  const integratedStarts = new Map<string, string>();
  const mockStarts = new Map<string, { id: string; mode: string; mockTestId: string }>();
  // Null authored audio assets remain owner URLs, never fake playable media.
  const listeningContent = (id: string) => INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part) => ({
    part: part.part, audioUrl: `/api/v1/me/ielts-mocks/attempts/${id}/audio/${part.audioAssetId}`,
    questions: part.questions.map(({ id, order, type, prompt, options, competencyTags }) => ({
      id, order, type, prompt, options: [...options], competencyTags: [...competencyTags],
    })),
  }));
  // Content snapshots are separate from the section-filtered learner response.
  const content = {
    listening: listeningContent(attemptId), reading: structuredClone(attempt.sectionContent.reading),
    writing: INITIAL_IELTS_ACADEMIC_MOCK.writing.tasks.map(({ task, title, prompt, minimumWords }) => ({ task, title, prompt, minimumWords })),
    speaking: INITIAL_IELTS_ACADEMIC_MOCK.speaking.parts.map(({ part, title, prompts, preparationSeconds, responseSeconds }) => ({ part, title, prompts: [...prompts], preparationSeconds, responseSeconds })),
  };
  const advanceMock = () => {
    const current = data.attempt.currentSection as Section;
    const index = sections.indexOf(current);
    const next = sections[index + 1];
    const started = new Date();
    data.attempt = ieltsMockAttemptSchema.parse({ ...data.attempt,
      revision: data.attempt.revision + 1, submittedSections: [...data.attempt.submittedSections, current],
      currentSection: next ?? 'COMPLETE', status: next ? 'IN_PROGRESS' : 'EVALUATION_PENDING',
      submittedAt: next ? null : started.toISOString(), sectionStartedAt: started.toISOString(),
      sectionDeadlineAt: new Date(started.getTime() + (next ? minutes[next] * 60_000 : 0)).toISOString(),
      sectionContent: { listening: next === 'LISTENING' ? content.listening : [], reading: next === 'READING' ? content.reading : [],
        writing: next === 'WRITING' ? content.writing : [], speaking: next === 'SPEAKING' ? content.speaking : [] },
    });
    data.report = ieltsMockReportSchema.parse({ ...data.report, attemptId: data.attempt.id });
    if (!next && data.catalog.mocks[0]) data.catalog.mocks[0].activeAttemptId = null;
  };
  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.replace(/^\/api\/v1/u, '');
    requests.push({ method, url: request.url(), body: request.postData() });
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const fail = (code: string, status = 409) => reply({ code, statusCode: status, message: code }, status);
    const body = (): unknown => { try { return request.postDataJSON(); } catch { return null; } };
    if (method === 'GET' && path === '/me') return reply(authUserSchema.parse(data.user));
    if (method === 'GET' && path === '/me/preferences') return reply(userPreferencesSchema.parse({ locale: data.user.locale }));
    if (method === 'PATCH' && path === '/me/preferences') {
      const parsed = userPreferencesSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      data.user = authUserSchema.parse({ ...data.user, locale: parsed.data.locale });
      return reply(parsed.data);
    }
    const base = '/me/ielts-integrated';
    const band = '/me/ielts-band-pathway';
    const mock = '/me/ielts-mocks';
    const sessionPath = `${base}/sessions/${data.session.id}`;
    const attemptPath = `${mock}/attempts/${data.attempt.id}`;
    const integratedRead = method === 'GET' && path === sessionPath;
    const integratedWrite = method === 'PUT' && path === sessionPath + '/progress';
    const integratedStart = method === 'POST' && path === base + '/sessions';
    const availability = method === 'GET' && path === base + '/availability';
    const bandRead = method === 'GET' && path === band;
    const bandStart = method === 'POST' && path === band + '/start';
    const bandTarget = method === 'PUT' && path === band + '/target';
    const bandEvaluate = method === 'POST' && path === band + '/evaluate';
    const mockCatalog = method === 'GET' && path === mock;
    const mockStart = method === 'POST' && path === mock + '/attempts';
    const mockRead = method === 'GET' && path === attemptPath;
    const mockSave = method === 'PUT' && path === attemptPath + '/responses';
    if (method === 'GET' && path.startsWith('/me/ielts-mocks/attempts/') && path.includes('/audio/')) return reply({ code: 'FIXTURE_AUDIO_UNAVAILABLE', message: 'Provider playback is outside this fixture.' }, 404);
    const mockSubmit = method === 'POST' && sections.some((section) => path === `${attemptPath}/sections/${section}/submit`);
    const mockReport = method === 'GET' && path === attemptPath + '/report';
    const surface = availability || integratedRead || integratedWrite || integratedStart ? 'integrated'
      : bandRead || bandStart || bandTarget || bandEvaluate ? 'pathway'
      : mockCatalog || mockStart || mockRead || mockSave || mockSubmit || mockReport ? 'mock' : null;
    if (!surface) return route.fallback();
    if (data.mode === 'error' && surface === kind) return fail('SERVICE_UNAVAILABLE', 503);
    if (availability) return reply(ieltsIntegratedAvailabilitySchema.parse(data.availability));
    if (bandRead) return reply(ieltsBandPathwayAvailabilitySchema.parse(data.band));
    if (mockCatalog) return reply(ieltsMockCatalogSchema.parse(data.catalog));
    if (integratedStart) {
      const parsed = startIeltsIntegratedSessionSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      if (integratedStarts.get(parsed.data.clientSessionId) === data.session.id) return reply(data.session);
      if (!data.availability.eligible) return fail(data.availability.lockedReason === 'BRIDGE_REQUIRED' ? 'IELTS_INTEGRATED_LOCKED' : 'IELTS_INTEGRATED_PROFILE_UNAVAILABLE');
      if (!data.availability.durations.includes(parsed.data.durationMinutes)) return fail('IELTS_INTEGRATED_PROFILE_UNAVAILABLE');
      const profile = INITIAL_IELTS_INTEGRATED_PROFILES.find((item) => item.durationMinutes === parsed.data.durationMinutes)!;
      const fresh = integratedSession(new Date().toISOString());
      data.session = ieltsIntegratedSessionSchema.parse({ ...fresh, id: parsed.data.clientSessionId,
        plan: { ...fresh.plan, durationMinutes: parsed.data.durationMinutes, difficulty: parsed.data.difficulty,
          blocks: fresh.plan.blocks.map((block, index) => ({ ...block, targetMinutes: profile.allocations[index]!.targetMinutes })) },
        blocks: fresh.blocks.map((block, index) => ({ ...block, targetMinutes: profile.allocations[index]!.targetMinutes })),
      });
      data.sessionExists = true; data.availability.activeSessionId = data.session.id;
      integratedStarts.set(parsed.data.clientSessionId, data.session.id);
      return reply(data.session);
    }
    if (integratedRead || integratedWrite) {
      if (!data.sessionExists) return fail('NOT_FOUND', 404);
      if (integratedRead) return reply(ieltsIntegratedSessionSchema.parse(data.session));
      const parsed = updateIeltsIntegratedProgressSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      if (data.session.completedAt || parsed.data.expectedRevision !== data.session.revision) return fail('IELTS_INTEGRATED_REVISION_STALE');
      if (parsed.data.blockIndex !== data.session.currentBlockIndex) return fail('IELTS_INTEGRATED_BLOCK_LOCKED', 422);
      const index = data.session.currentBlockIndex;
      const completedAt = new Date().toISOString();
      const last = index === 3;
      data.session = ieltsIntegratedSessionSchema.parse({ ...data.session, revision: data.session.revision + 1,
        currentBlockIndex: last ? 3 : index + 1, completedAt: last ? completedAt : null,
        blocks: data.session.blocks.map((block, i) => i === index ? { ...block, completedAt,
          timedOut: !!block.startedAt && Date.now() > Date.parse(block.startedAt) + block.targetMinutes * 60_000 }
          : i === index + 1 ? { ...block, startedAt: completedAt } : block),
      });
      if (last) data.availability.activeSessionId = null;
      return reply(ieltsIntegratedProgressResultSchema.parse({ session: data.session, feedbackMessage: null,
        nextStep: last ? 'Review your four-skill evidence and continue targeted practice.' : null }));
    }
    if (bandStart) {
      const parsed = startIeltsBandPathwaySchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      if (data.band.journey) return reply(ieltsBandPathwaySchema.parse(data.band.journey));
      if (!data.band.eligible) return fail(data.band.lockedReason === 'BRIDGE_REQUIRED' ? 'IELTS_BAND_PATHWAY_LOCKED' : 'IELTS_BAND_CURRICULUM_UNAVAILABLE');
      data.band.journey = ieltsBandPathwaySchema.parse({ ...pathway(new Date().toISOString()), targetBand: parsed.data.targetBand });
      return reply(data.band.journey);
    }
    if (bandTarget || bandEvaluate) {
      const parsed = bandTarget ? updateIeltsBandTargetSchema.safeParse(body()) : evaluateIeltsBandPathwaySchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      const journey = data.band.journey;
      if (!journey) return fail('NOT_FOUND', 404);
      if (journey.revision !== parsed.data.expectedRevision || (bandEvaluate && journey.completedAt)) return fail('IELTS_BAND_REVISION_STALE');
      data.band.journey = ieltsBandPathwaySchema.parse({ ...journey, revision: journey.revision + 1,
        ...('targetBand' in parsed.data ? { targetBand: parsed.data.targetBand } : {}) });
      return reply(data.band.journey);
    }
    if (mockStart) {
      const parsed = startIeltsMockAttemptSchema.safeParse(body());
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      const prior = mockStarts.get(parsed.data.clientAttemptId);
      if (prior) {
        if (prior.mockTestId !== parsed.data.mockTestId || prior.mode !== parsed.data.mode) return fail('IELTS_MOCK_CLIENT_ATTEMPT_REUSED');
        return prior.id === data.attempt.id ? reply(data.attempt) : fail('NOT_FOUND', 404);
      }
      if (parsed.data.mockTestId !== mockTestId) return route.fallback();
      if (!data.catalog.eligible) return fail(data.catalog.lockedReason === 'BAND_PATHWAY_REQUIRED' ? 'IELTS_BAND_PATHWAY_REQUIRED' : 'IELTS_MOCK_NOT_PUBLISHED');
      if (!data.catalog.mocks[0]?.allowedModes.includes(parsed.data.mode)) return fail('IELTS_MOCK_MODE_NOT_ALLOWED', 422);
      const startedAt = new Date();
      data.attempt = ieltsMockAttemptSchema.parse({ ...shellAttempt(), id: parsed.data.clientAttemptId, mode: parsed.data.mode,
        currentSection: 'LISTENING', responses: {}, submittedSections: [], startedAt: startedAt.toISOString(), sectionStartedAt: startedAt.toISOString(),
        sectionDeadlineAt: new Date(startedAt.getTime() + minutes.LISTENING * 60_000).toISOString(),
        sectionContent: { listening: listeningContent(parsed.data.clientAttemptId), reading: [], writing: [], speaking: [] } });
      data.attemptExists = true; data.catalog.mocks[0]!.activeAttemptId = data.attempt.id;
      data.report = ieltsMockReportSchema.parse({ ...data.report, attemptId: data.attempt.id });
      mockStarts.set(parsed.data.clientAttemptId, { id: data.attempt.id, mode: parsed.data.mode, mockTestId });
      return reply(data.attempt);
    }
    if (!data.attemptExists) return fail('NOT_FOUND', 404);
    if (mockRead) {
      if (data.attempt.status === 'IN_PROGRESS' && Date.now() > Date.parse(data.attempt.sectionDeadlineAt)) advanceMock();
      return reply(ieltsMockAttemptSchema.parse(data.attempt));
    }
    if (mockReport) {
      if (data.attempt.currentSection !== 'COMPLETE') return fail('IELTS_MOCK_REPORT_NOT_READY');
      return reply(ieltsMockReportSchema.parse({ ...data.report, attemptId: data.attempt.id }));
    }
    if (mockSave || mockSubmit) {
      const section = mockSubmit ? path.split('/').at(-2) : data.attempt.currentSection;
      const parsed = mockSave ? saveIeltsMockResponsesSchema.safeParse(body())
        : submitIeltsMockSectionSchema.safeParse({ ...(body() as object), section });
      if (!parsed.success) return fail('VALIDATION_ERROR', 400);
      if (data.attempt.status !== 'IN_PROGRESS' || parsed.data.expectedRevision !== data.attempt.revision) return fail('IELTS_MOCK_REVISION_STALE');
      if (mockSubmit) {
        if (section !== data.attempt.currentSection) return fail('IELTS_MOCK_SECTION_LOCKED', 422);
        advanceMock(); return reply(data.attempt);
      }
      if (Date.now() > Date.parse(data.attempt.sectionDeadlineAt)) return fail('IELTS_MOCK_SECTION_EXPIRED');
      const current = data.attempt.sectionContent;
      const allowed = data.attempt.currentSection === 'READING' ? current.reading.flatMap((item) => item.questions.map((q) => q.id))
        : data.attempt.currentSection === 'LISTENING' ? current.listening.flatMap((item) => item.questions.map((q) => q.id))
        : data.attempt.currentSection === 'WRITING' ? current.writing.map((item) => `writing-${item.task}`) : current.speaking.map((item) => `speaking-${item.part}`);
      if (!('responses' in parsed.data)) return fail('VALIDATION_ERROR', 400);
      if (Object.keys(parsed.data.responses).some((id) => !allowed.includes(id))) return fail('IELTS_MOCK_RESPONSE_NOT_IN_CURRENT_SECTION', 422);
      data.attempt = ieltsMockAttemptSchema.parse({ ...data.attempt, revision: data.attempt.revision + 1,
        responses: { ...data.attempt.responses, ...parsed.data.responses } });
      return reply(data.attempt);
    }
    return route.fallback();
  });
  return { data, requests };
}
