import {
  adminAudioSettingsSchema, adminAuditEventSchema, adminJobDetailSchema,
  adminOperationsSummarySchema, adminPilotAnalyticsResponseSchema, aiSettingsSchema,
  audioSettingsSchema,
} from '@worklingo/contracts';
import { shellUser } from './shell-contracts';

// Copied as public DTOs, never imported from test modules. Owner references:
// audio/{audio,admin-audio}-settings-panel.test.tsx; ai/ai-settings-panel.test.tsx;
// admin-audit/audit-workspace.test.tsx; admin-observability/observability-workspaces.test.tsx;
// API operations/application/operations-query.service.spec.ts (counts and job shape).
const audio = audioSettingsSchema.parse({ browserVoiceId: null, sourceId: 'system-default' });
const adminAudio = adminAudioSettingsSchema.parse({
  defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
  providers: [
    { available: true, defaultVoiceId: 'fake-neutral', displayName: 'Simulation audio',
      id: 'fake-tts', simulation: true, supportedLocales: ['en-US'] },
    { available: false, defaultVoiceId: 'en-US-JennyNeural', displayName: 'Azure Speech',
      id: 'azure-speech', simulation: false, supportedLocales: ['en-US'] },
  ],
});
const ai = aiSettingsSchema.parse({
  routingEnabled: true, canManageSystem: false, accountId: shellUser.id,
  preferredProvider: 'system-default', fallbackEnabled: true, effectiveProvider: 'discovery',
  effectiveFallbackEnabled: true, systemFallbackEnabled: true, simulation: false,
  maxOutputTokens: 2048, providers: [
    { id: 'discovery', available: true, model: 'intern-s2' },
    { id: 'openai', available: false, model: null },
  ],
});
const adminAi = aiSettingsSchema.parse({ ...ai, preferredProvider: 'discovery', canManageSystem: true });
const ownerAuditEvents = [
  { action: 'PUBLISH_PATH', actorDisplayName: 'Super Admin',
    actorId: '11111111-1111-4111-8111-111111111111', createdAt: '2026-10-12T01:00:00.000Z',
    id: '22222222-2222-4222-8222-222222222222', metadata: { ip: '127.0.0.1' },
    newState: { status: 'PUBLISHED' }, oldState: { status: 'DRAFT' },
    resourceId: '33333333-3333-4333-8333-333333333333', resourceType: 'LearningPath' },
  { action: 'UPDATE_LEVEL', actorDisplayName: 'Content Lead',
    actorId: '44444444-4444-4444-8444-444444444444', createdAt: '2026-10-12T00:30:00.000Z',
    id: '55555555-5555-4555-8555-555555555555', metadata: null,
    newState: { name: 'Intermediate B2' }, oldState: { name: 'Intermediate B1' },
    resourceId: '66666666-6666-4666-8666-666666666666', resourceType: 'Level' },
  { action: 'CREATE_MISSION', actorDisplayName: 'Content Lead',
    actorId: '44444444-4444-4444-8444-444444444444', createdAt: '2026-10-12T00:00:00.000Z',
    id: '77777777-7777-4777-8777-777777777777', metadata: null,
    newState: { title: 'First Mission' }, oldState: null,
    resourceId: '88888888-8888-4888-8888-888888888888', resourceType: 'Mission' },
].map((item) => adminAuditEventSchema.parse(item));

// Extend the owner examples deterministically so the real UI's limit=25 can page.
const audit = [...ownerAuditEvents, ...Array.from({ length: 24 }, (_, index) =>
  adminAuditEventSchema.parse({ ...ownerAuditEvents[0],
    id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    createdAt: new Date(Date.parse('2026-10-11T23:59:00.000Z') - index * 60_000).toISOString(),
  }))];

// Match the service owner's 5 pending, 2 running, 1 failed, 23 completed example.
// Extra IDs and attempt details are synthetic, safe, schema-valid pagination data.
const jobs = Array.from({ length: 31 }, (_, index) => {
  const status = index < 5 ? 'PENDING' : index < 7 ? 'RUNNING' : index === 7 ? 'FAILED' : 'COMPLETED';
  const createdAt = new Date(Date.parse('2026-10-12T00:00:00.000Z') - index * 60_000).toISOString();
  const terminal = status === 'FAILED' || status === 'COMPLETED';
  return adminJobDetailSchema.parse({
    id: index === 5 ? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      : `72000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    type: index >= 28 ? 'EVALUATE_ATTEMPT' : 'AUDIO_GENERATION', status,
    attemptCount: status === 'PENDING' ? 0 : 1, maxAttempts: 3,
    availableAt: createdAt, createdAt, completedAt: terminal ? createdAt : null,
    errorCode: status === 'FAILED' ? 'TTS_PROVIDER_UNAVAILABLE' : null,
    errorSummary: status === 'FAILED' ? 'Audio provider unavailable.' : null,
    leaseOwner: status === 'RUNNING' ? 'worker-1' : null,
    resourceId: 'res-1', resourceType: 'AudioArtifact', retryable: true,
    payloadSummary: { resourceId: 'res-1', resourceType: 'AudioArtifact' },
    attempts: status === 'PENDING' ? [] : [{
      attemptNumber: 1, startedAt: createdAt, completedAt: terminal ? createdAt : null,
      outcome: status === 'RUNNING' ? 'RUNNING' : status === 'FAILED' ? 'FAILED' : 'SUCCEEDED',
      errorCode: status === 'FAILED' ? 'TTS_PROVIDER_UNAVAILABLE' : null,
      errorSummary: status === 'FAILED' ? 'Audio provider unavailable.' : null,
      providerModel: null, providerName: null,
    }],
  });
});
const operations = adminOperationsSummarySchema.parse({
  activeWorkers: 1, completedCount: 23, failedCount: 1, queueDepth: 7, runningCount: 2,
  jobTypeBreakdown: {
    AUDIO_GENERATION: { completed: 20, failed: 1, pending: 5, running: 2, total: 28 },
    EVALUATE_ATTEMPT: { completed: 3, failed: 0, pending: 0, running: 0, total: 3 },
  },
  workerConfig: { leaseMs: 30_000, pollIntervalMs: 5_000, workerEnabled: true },
});
const analytics = adminPilotAnalyticsResponseSchema.parse({
  definitions: [{ description: 'A learning session was completed.', eventType: 'LEARNING_SESSION_COMPLETED' }],
  from: '2026-10-01', to: '2026-10-12',
  metrics: [{ count: 4, dateKey: '2026-10-10', dimensions: {}, eventType: 'LEARNING_SESSION_COMPLETED' }],
  retention: {
    week1: { cohortSize: 10, retainedCount: 6, retentionRate: 0.6 },
    week4: { cohortSize: 5, retainedCount: 2, retentionRate: 0.4 },
  },
});

/** Seed DTOs; every installation deep-clones these before applying its state. */
export const settingsFixtures = { audio, adminAudio, ai, adminAi, audit, jobs, operations, analytics };
