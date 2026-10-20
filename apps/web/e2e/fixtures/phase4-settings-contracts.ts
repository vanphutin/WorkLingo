import { Buffer } from 'node:buffer';
import type { Page } from '@playwright/test';
import {
  adminAudioSettingsSchema, adminAuditFilterSchema, adminAuditPageSchema,
  adminJobDetailSchema, adminJobItemSchema, adminJobPageSchema, adminOperationsQuerySchema,
  adminOperationsSummarySchema, adminPilotAnalyticsQuerySchema, adminPilotAnalyticsResponseSchema,
  aiSettingsSchema, audioSettingsSchema, authUserSchema, updateAdminAiSettingsSchema,
  updateAdminAudioSettingsSchema, updateAiSettingsSchema, updateAudioSettingsSchema,
  userPreferencesSchema, type AuthUser,
} from '@worklingo/contracts';
import { settingsFixtures } from './phase4-settings-data';
import { shellUser } from './shell-contracts';

export { settingsFixtures } from './phase4-settings-data';
export interface SettingsFixtureOptions {
  readonly kind?: 'settings' | 'audio' | 'ai' | 'adminAudio' | 'adminAi' | 'audit' | 'operations' | 'analytics';
  readonly state?: 'loaded' | 'empty' | 'error';
  readonly locale?: 'vi' | 'en';
  readonly role?: AuthUser['roles'][number];
}
export interface SettingsFixtureRequest {
  readonly method: string;
  readonly url: string;
  /** Raw body only; no cookies or authorization/account headers are recorded. */
  readonly body: string | null;
}

/**
 * Install before navigating to /settings, /settings/audio, /settings/ai,
 * /admin/settings/audio, /admin/settings/ai, /admin/audit, /admin/operations,
 * or /admin/analytics. All owners are served; kind scopes only empty/error.
 * Defaults: settings/loaded/vi; LEARNER for learner kinds, SYSTEM_ADMIN otherwise.
 * /me stays authenticated in error mode. settings error affects the preference
 * PATCH only: the landing page has no initial owner data GET/error/empty state.
 * Settings/audio/AI singleton kinds reject empty before interception is installed.
 * Audit empty clears events; operations empty clears jobs and summary counts;
 * analytics empty keeps definitions and zeros metrics/retention.
 *
 * Supports locale, learner audio, admin audio and account/system AI PATCH saves;
 * audit exact filters, inclusive dates and owner base64url [createdAt,id] cursors;
 * operations exact status/type filters, numbered pages and safe detail reads.
 * AI effective fields follow the owner, including system fallback gating.
 * OpenAI/Azure remain unavailable, as in owner tests. Admin audio accepts only
 * the fake provider's default voice or null. Failed saves do not change data.
 *
 * Analytics echoes a valid bounded query and filters the frozen daily sample;
 * retention is a fixed owner example, NOT recalculated for the date range.
 * Unsupported: live metrics/cohort calculation, live provider calls, audio
 * generation/playback/browser voices, job mutations/execution/retries, audit
 * writes from provider saves, persistence across installs, concurrent accounts,
 * session/logout and full authorization journeys. Role configures /me and the
 * admin AI canManageSystem/save gate only; other API guards are not simulated.
 * Theme/transparency use the real local controls and have no fixture API.
 * Unowned API paths/methods return 501; this installer never forwards to network.
 * Parent owns browser QA. These DTOs do not certify real provider readiness.
 */
export async function installSettingsFixtures(page: Page, options: SettingsFixtureOptions = {}) {
  const kind = options.kind ?? 'settings';
  const mode = options.state ?? 'loaded';
  if (mode === 'empty' && !['audit', 'operations', 'analytics'].includes(kind)) {
    throw new Error(`Unsupported empty state for singleton ${kind}; use loaded or error.`);
  }
  const learner = ['settings', 'audio', 'ai'].includes(kind);
  const data = {
    ...structuredClone(settingsFixtures), mode,
    user: authUserSchema.parse({ ...shellUser, locale: options.locale ?? 'vi', roles: [options.role ?? (learner ? 'LEARNER' : 'SYSTEM_ADMIN')] }),
  };
  data.ai.accountId = data.user.id;
  data.adminAi.accountId = data.user.id;
  data.adminAi.canManageSystem = data.user.roles.includes('SYSTEM_ADMIN');
  if (mode === 'empty' && kind === 'audit') data.audit = [];
  if (mode === 'empty' && kind === 'operations') {
    data.jobs = [];
    data.operations = adminOperationsSummarySchema.parse({ ...data.operations,
      activeWorkers: 0, completedCount: 0, failedCount: 0, jobTypeBreakdown: {}, queueDepth: 0, runningCount: 0 });
  }
  if (mode === 'empty' && kind === 'analytics') {
    data.analytics.metrics = [];
    data.analytics.retention = {
      week1: { cohortSize: 0, retainedCount: 0, retentionRate: 0 },
      week4: { cohortSize: 0, retainedCount: 0, retentionRate: 0 },
    };
  }
  const requests: SettingsFixtureRequest[] = [];
  const syncAi = () => {
    data.adminAi.effectiveProvider = data.adminAi.preferredProvider === 'openai' ? 'openai' : 'discovery';
    data.adminAi.systemFallbackEnabled = data.adminAi.fallbackEnabled;
    data.adminAi.effectiveFallbackEnabled = data.adminAi.fallbackEnabled;
    data.ai.systemFallbackEnabled = data.adminAi.fallbackEnabled;
    data.ai.effectiveProvider = !data.ai.routingEnabled || data.ai.preferredProvider === 'system-default'
      ? data.adminAi.effectiveProvider : data.ai.preferredProvider;
    data.ai.effectiveFallbackEnabled = data.ai.fallbackEnabled && data.adminAi.fallbackEnabled;
  };

  await page.route(/\/api\/v1(?:\/|$)/u, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/u, '');
    requests.push({ method, url: request.url(), body: request.postData() });
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const fail = (code: string, status: number, message: string) => reply({ code, statusCode: status, message }, status);
    const invalid = () => fail('BAD_REQUEST', 400, 'Invalid fixture request.');
    const unavailable = (owner: SettingsFixtureOptions['kind']) => mode === 'error' && owner === kind;
    const error = () => fail('SERVICE_UNAVAILABLE', 503, 'Fixture data temporarily unavailable.');
    const body = (): unknown => { try { return request.postDataJSON(); } catch { return null; } };
    const accountChanged = () => {
      const expected = request.headers()['x-worklingo-account-id'];
      return expected !== undefined && expected !== data.user.id;
    };
    const accountConflict = () => fail('ACCOUNT_CHANGED', 409, 'The signed-in account has changed');
    const query = Object.fromEntries(url.searchParams);
    if (method === 'GET' && path === '/me') return reply(authUserSchema.parse(data.user));
    if (method === 'PATCH' && path === '/me/preferences') {
      if (accountChanged()) return accountConflict();
      if (unavailable('settings')) return error();
      const parsed = userPreferencesSchema.safeParse(body());
      if (!parsed.success) return invalid();
      data.user.locale = parsed.data.locale;
      return reply(userPreferencesSchema.parse(parsed.data));
    }
    if (path === '/me/audio-settings' && (method === 'GET' || method === 'PATCH')) {
      if (unavailable('audio')) return error();
      if (method === 'PATCH') {
        const parsed = updateAudioSettingsSchema.safeParse(body());
        if (!parsed.success) return invalid();
        data.audio = audioSettingsSchema.parse({ ...data.audio, ...parsed.data });
      }
      return reply(audioSettingsSchema.parse(data.audio));
    }
    if (path === '/admin/audio-settings' && (method === 'GET' || method === 'PATCH')) {
      if (unavailable('adminAudio')) return error();
      if (method === 'PATCH') {
        const parsed = updateAdminAudioSettingsSchema.safeParse(body());
        if (!parsed.success) return invalid();
        const provider = data.adminAudio.providers.find((item) => item.id === parsed.data.providerId);
        if (!provider?.available) return fail('TTS_PROVIDER_UNAVAILABLE', 422, 'The selected text to speech provider is unavailable.');
        const voice = parsed.data.defaultVoiceId === undefined ? provider.defaultVoiceId : parsed.data.defaultVoiceId;
        if (voice !== null && voice !== provider.defaultVoiceId) return fail('TTS_VOICE_UNSUPPORTED', 422, 'The selected text to speech voice is unsupported.');
        data.adminAudio = adminAudioSettingsSchema.parse({ ...data.adminAudio, providerId: provider.id, defaultVoiceId: voice });
      }
      return reply(adminAudioSettingsSchema.parse(data.adminAudio));
    }
    if (['/me/ai-settings', '/admin/ai-settings'].includes(path) && (method === 'GET' || method === 'PATCH')) {
      const admin = path.startsWith('/admin/');
      const owner = admin ? 'adminAi' : 'ai';
      if (unavailable(owner)) return error();
      if (method === 'PATCH') {
        if (accountChanged()) return accountConflict();
        if (admin && !data.adminAi.canManageSystem) return fail('FORBIDDEN', 403, 'System administrator role required.');
        const parsed = updateAiSettingsSchema.safeParse(body());
        if (!parsed.success || (admin && !updateAdminAiSettingsSchema.safeParse(parsed.data).success)) return invalid();
        const settings = admin ? data.adminAi : data.ai;
        if (!settings.routingEnabled) return fail('AI_ROUTING_DISABLED', 422, 'AI routing is managed by server configuration.');
        if (parsed.data.preferredProvider !== 'system-default' && !settings.providers.some((provider) => provider.id === parsed.data.preferredProvider && provider.available)) {
          return fail('AI_PROVIDER_UNAVAILABLE', 422, 'The selected AI provider is not configured.');
        }
        Object.assign(settings, parsed.data);
      }
      syncAi();
      return reply(aiSettingsSchema.parse(admin ? data.adminAi : data.ai));
    }
    if (method === 'GET' && path === '/admin/audit-events') {
      if (unavailable('audit')) return error();
      const parsed = adminAuditFilterSchema.safeParse(query);
      if (!parsed.success) return invalid();
      const filters = parsed.data;
      let cursor: [string, string] | null = null;
      try {
        const decoded: unknown = filters.cursor ? JSON.parse(Buffer.from(filters.cursor, 'base64url').toString('utf8')) : null;
        if (Array.isArray(decoded) && decoded.length === 2 && decoded.every((value) => typeof value === 'string')) {
          cursor = decoded as [string, string];
        }
      } catch { /* The owner ignores malformed cursor encodings. */ }
      const rows = data.audit.filter((item) =>
        (!filters.action || item.action === filters.action) && (!filters.actorId || item.actorId === filters.actorId) &&
        (!filters.resourceType || item.resourceType === filters.resourceType) && (!filters.resourceId || item.resourceId === filters.resourceId) &&
        (!filters.from || Date.parse(item.createdAt) >= Date.parse(filters.from)) && (!filters.to || Date.parse(item.createdAt) <= Date.parse(filters.to)) &&
        (!cursor || Date.parse(item.createdAt) < Date.parse(cursor[0]) || (Date.parse(item.createdAt) === Date.parse(cursor[0]) && item.id < cursor[1])))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
      const items = rows.slice(0, filters.limit);
      const last = items.at(-1);
      return reply(adminAuditPageSchema.parse({ items, nextCursor: rows.length > filters.limit && last
        ? Buffer.from(JSON.stringify([last.createdAt, last.id])).toString('base64url') : null }));
    }
    if (method === 'GET' && path === '/admin/operations/summary') {
      if (unavailable('operations')) return error();
      return reply(adminOperationsSummarySchema.parse(data.operations));
    }
    if (method === 'GET' && path === '/admin/operations/jobs') {
      if (unavailable('operations')) return error();
      const parsed = adminOperationsQuerySchema.safeParse(query);
      if (!parsed.success) return invalid();
      const { page: currentPage, pageSize, status, type } = parsed.data;
      const rows = data.jobs.filter((job) => (!status || job.status === status) && (!type || job.type === type))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      return reply(adminJobPageSchema.parse({
        items: rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => adminJobItemSchema.parse(item)),
        page: currentPage, pageSize, total: rows.length, totalPages: Math.ceil(rows.length / pageSize),
      }));
    }
    const detail = /^\/admin\/operations\/jobs\/([^/]+)$/u.exec(path);
    if (method === 'GET' && detail) {
      if (unavailable('operations')) return error();
      const job = data.jobs.find((item) => item.id === detail[1]);
      return job ? reply(adminJobDetailSchema.parse(job)) : fail('NOT_FOUND', 404, 'Job not found.');
    }
    if (method === 'GET' && path === '/admin/analytics/pilot') {
      if (unavailable('analytics')) return error();
      const parsed = adminPilotAnalyticsQuerySchema.safeParse(query);
      if (!parsed.success) return invalid();
      return reply(adminPilotAnalyticsResponseSchema.parse({ ...data.analytics, ...parsed.data,
        metrics: data.analytics.metrics.filter((metric) => metric.dateKey >= parsed.data.from && metric.dateKey <= parsed.data.to) }));
    }
    return fail('FIXTURE_UNSUPPORTED', 501, 'This API request is outside the Slice7 fixture contract.');
  });
  return { data, requests };
}
