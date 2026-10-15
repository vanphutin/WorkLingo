import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../src/common/config/app-config.schema.js';
import { AiSettingsService } from '../../src/ai-gateway/application/ai-settings.service.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('AI settings API', () => {
  let context: LearningSessionTestContext;
  let baselineAi: AppConfig['ai'];
  beforeAll(async () => { context = await createLearningSessionTestContext('ai_settings'); baselineAi = context.app.get(ConfigService).getOrThrow<AppConfig['ai']>('ai'); }, 45_000);
  beforeEach(async () => { context.app.get(ConfigService).set('ai', baselineAi); await context.database.aiRoutingSetting.deleteMany(); await context.resetLearners(); });
  afterAll(async () => context?.close());

  it('requires authentication and preserves account ownership and strict input', async () => {
    await request(context.app.getHttpServer()).get('/api/v1/me/ai-settings').expect(401);
    const first = await registerPendingLearner(context.app, { displayName: 'First', email: 'ai-first@example.test' });
    const second = await registerPendingLearner(context.app, { displayName: 'Second', email: 'ai-second@example.test' });
    await first.agent.get('/api/v1/me/ai-settings').expect(200).expect(({ body }) => {
      expect(body.preferredProvider).toBe('system-default'); expect(JSON.stringify(body)).not.toMatch(/apiKey|Bearer|sk-/u);
    });
    await first.agent.patch('/api/v1/me/ai-settings').send({ preferredProvider: 'system-default', fallbackEnabled: false }).expect(200);
    await second.agent.get('/api/v1/me/ai-settings').expect(200).expect(({ body }) => expect(body.fallbackEnabled).toBe(true));
    await second.agent.patch('/api/v1/me/ai-settings').set('x-worklingo-account-id', first.user.id).send({ preferredProvider: 'system-default', fallbackEnabled: false }).expect(409);
    for (const body of [{ preferredProvider: 'invalid', fallbackEnabled: true }, { preferredProvider: 'system-default', fallbackEnabled: 'true' }, { preferredProvider: 'system-default', fallbackEnabled: true, userId: second.user.id }]) {
      await first.agent.patch('/api/v1/me/ai-settings').send(body).expect(400);
    }
    await first.agent.patch('/api/v1/me/ai-settings').send({ preferredProvider: 'openai', fallbackEnabled: true }).expect(422);
    await expect(context.database.aiRoutingSetting.findUnique({ where: { id: first.user.id } })).resolves.toMatchObject({ preferredProvider: 'system-default', fallbackEnabled: false, userId: first.user.id });
  });
  it('allows system administration only and makes global fallback a hard ceiling', async () => {
    const admin = await registerPendingLearner(context.app, { displayName: 'Admin', email: 'ai-admin@example.test' });
    await admin.agent.get('/api/v1/admin/ai-settings').expect(403);
    await context.database.user.update({ where: { id: admin.user.id }, data: { role: 'CONTENT_ADMIN' } });
    await admin.agent.get('/api/v1/admin/ai-settings').expect(200);
    await admin.agent.patch('/api/v1/admin/ai-settings').send({ preferredProvider: 'discovery', fallbackEnabled: false }).expect(403);
    await context.database.user.update({ where: { id: admin.user.id }, data: { role: 'SYSTEM_ADMIN' } });
    // Fake mode exposes no configured live providers; global selections must fail without mutation.
    await admin.agent.patch('/api/v1/admin/ai-settings').send({ preferredProvider: 'discovery', fallbackEnabled: false }).expect(422);
    await context.database.aiRoutingSetting.create({ data: { id: 'system', preferredProvider: 'discovery', fallbackEnabled: false } });
    const learner = await registerPendingLearner(context.app, { displayName: 'Learner', email: 'ai-policy@example.test' });
    await learner.agent.patch('/api/v1/me/ai-settings').send({ preferredProvider: 'system-default', fallbackEnabled: true }).expect(200).expect(({ body }) => {
      expect(body.effectiveFallbackEnabled).toBe(false); expect(body.systemFallbackEnabled).toBe(false);
    });
    await context.database.user.delete({ where: { id: learner.user.id } });
    await expect(context.database.aiRoutingSetting.findUnique({ where: { id: learner.user.id } })).resolves.toBeNull();
  });
  it('persists configured system defaults with audit evidence and resolves account overrides', async () => {
    // Only metadata is configured. The already-created fake evaluation port never calls an external service.
    context.app.get(ConfigService).set('ai', { ...baselineAi, languageEvaluation: { provider: 'discovery', apiKey: 'synthetic-only', model: 'qwen3.8-27b', baseUrl: 'https://example.test/v1' }, routing: { ...baselineAi.routing, discovery: { apiKey: 'synthetic-only', model: 'qwen3.8-27b', baseUrl: 'https://example.test/v1' }, openai: { apiKey: 'synthetic-only', model: 'gpt-test', baseUrl: 'https://example.test/v1' } } });
    const admin = await registerPendingLearner(context.app, { displayName: 'System Admin', email: 'ai-system@example.test' });
    await context.database.user.update({ where: { id: admin.user.id }, data: { role: 'SYSTEM_ADMIN' } });
    await admin.agent.patch('/api/v1/admin/ai-settings').send({ preferredProvider: 'system-default', fallbackEnabled: true }).expect(400);
    await admin.agent.patch('/api/v1/admin/ai-settings').send({ preferredProvider: 'discovery', fallbackEnabled: false }).expect(200);
    const learner = await registerPendingLearner(context.app, { displayName: 'Choice', email: 'ai-choice@example.test' });
    await learner.agent.patch('/api/v1/me/ai-settings').send({ preferredProvider: 'openai', fallbackEnabled: true }).expect(200);
    await expect(context.app.get(AiSettingsService).resolve(learner.user.id)).resolves.toEqual({ preferredProvider: 'openai', fallbackEnabled: false });
    await admin.agent.patch('/api/v1/admin/ai-settings').send({ preferredProvider: 'discovery', fallbackEnabled: true }).expect(200);
    await expect(context.app.get(AiSettingsService).resolve(learner.user.id)).resolves.toEqual({ preferredProvider: 'openai', fallbackEnabled: true });
    const audit = await context.database.auditLog.findMany({ where: { action: 'ai.settings.updated' } });
    expect(audit).toHaveLength(2); expect(audit.every(row => row.actorId === admin.user.id)).toBe(true);
    expect(JSON.stringify(audit)).not.toMatch(/synthetic-only|apiKey/u);
    const ai = context.app.get(ConfigService).get('ai') as AppConfig['ai'];
    context.app.get(ConfigService).set('ai', { ...ai, routing: { ...ai.routing, enabled: false } });
    await expect(context.app.get(AiSettingsService).resolve(learner.user.id)).resolves.toEqual({ preferredProvider: 'discovery', fallbackEnabled: false });
    await learner.agent.get('/api/v1/me/ai-settings').expect(200).expect(({ body }) => expect(body.effectiveProvider).toBe('discovery'));
    await learner.agent.patch('/api/v1/me/ai-settings').send({ preferredProvider: 'openai', fallbackEnabled: true }).expect(422);
  });
});
