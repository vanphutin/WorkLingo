import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedContentAdmin } from '../../src/users/infrastructure/seed-content-admin.js';
import {
  createLearningSessionTestContext,
  registerPendingLearner,
  type LearningSessionTestContext,
} from './learning-session-test-harness.js';

describe('audio settings API', () => {
  let context: LearningSessionTestContext;
  let admin: Awaited<ReturnType<typeof registerPendingLearner>>['agent'];

  beforeAll(async () => {
    context = await createLearningSessionTestContext('audio_settings');
    const email = `audio-admin-${randomUUID()}@example.test`;
    const password = 'AudioAdmin123!';
    await seedContentAdmin(context.database, {
      displayName: 'Audio Admin', email, password,
    });
    const request = await import('supertest');
    admin = request.default.agent(context.app.getHttpServer());
    await admin.post('/api/v1/auth/login').send({ email, password }).expect(200);
  }, 40_000);

  afterAll(async () => context?.close());

  it('persists owner-scoped learner sources and nullable browser voices', async () => {
    const first = await registerPendingLearner(context.app, {
      displayName: 'Audio Learner A', email: 'audio-a@example.test',
    });
    const second = await registerPendingLearner(context.app, {
      displayName: 'Audio Learner B', email: 'audio-b@example.test',
    });

    await first.agent.get('/api/v1/me/audio-settings').expect(200, {
      browserVoiceId: null,
      sourceId: 'system-default',
    });

    for (const sourceId of ['published-audio', 'browser-tts', 'system-default']) {
      const browserVoiceId = sourceId === 'browser-tts' ? 'voice-en-1' : null;
      await first.agent.patch('/api/v1/me/audio-settings')
        .send({ browserVoiceId, sourceId })
        .expect(200, { browserVoiceId, sourceId });
    }

    await first.agent.patch('/api/v1/me/audio-settings')
      .send({ browserVoiceId: 'voice-en-2', sourceId: 'browser-tts' })
      .expect(200);
    await first.agent.patch('/api/v1/me/audio-settings')
      .send({ sourceId: 'browser-tts' })
      .expect(200, { browserVoiceId: 'voice-en-2', sourceId: 'browser-tts' });
    await first.agent.get('/api/v1/me/audio-settings')
      .expect(200, { browserVoiceId: 'voice-en-2', sourceId: 'browser-tts' });
    await second.agent.get('/api/v1/me/audio-settings').expect(200, {
      browserVoiceId: null,
      sourceId: 'system-default',
    });

    const unsupported = await first.agent.patch('/api/v1/me/audio-settings')
      .send({ sourceId: 'remote-magic' })
      .expect(422);
    expect(unsupported.body.code).toBe('AUDIO_SOURCE_UNSUPPORTED');
    await first.agent.patch('/api/v1/me/audio-settings')
      .send({ browserVoiceId: '', sourceId: 'browser-tts' })
      .expect(400);
  });

  it('protects Admin settings, rejects unsafe selections, and audits safe IDs', async () => {
    const learner = await registerPendingLearner(context.app, {
      displayName: 'Settings Learner', email: 'settings-learner@example.test',
    });
    await learner.agent.get('/api/v1/admin/audio-settings').expect(403);

    const initial = await admin.get('/api/v1/admin/audio-settings').expect(200);
    expect(initial.body).toMatchObject({
      defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
    });
    expect(initial.body.providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ available: true, id: 'fake-tts', simulation: true }),
      expect.objectContaining({ available: false, id: 'azure-speech', simulation: false }),
    ]));
    expect(JSON.stringify(initial.body)).not.toMatch(/key|secret|region|credential/i);

    const unavailable = await admin.patch('/api/v1/admin/audio-settings')
      .send({ defaultVoiceId: 'en-US-JennyNeural', providerId: 'azure-speech' })
      .expect(422);
    expect(unavailable.body.code).toBe('TTS_PROVIDER_UNAVAILABLE');

    const unsupportedVoice = await admin.patch('/api/v1/admin/audio-settings')
      .send({ defaultVoiceId: 'unknown-voice', providerId: 'fake-tts' })
      .expect(422);
    expect(unsupportedVoice.body.code).toBe('TTS_VOICE_UNSUPPORTED');

    await admin.patch('/api/v1/admin/audio-settings')
      .send({ defaultVoiceId: 'fake-neutral', providerId: 'fake-tts' })
      .expect(200);
    await admin.get('/api/v1/admin/audio-settings').expect(200, {
      defaultVoiceId: 'fake-neutral',
      providerId: 'fake-tts',
      providers: initial.body.providers,
    });
    const audit = await context.database.auditLog.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
      where: { action: 'audio.settings.updated' },
    });
    expect(audit.oldState).toEqual({
      defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
    });
    expect(audit.newState).toEqual({
      defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
    });
    expect(JSON.stringify(audit)).not.toMatch(/key|secret|region|credential/i);
  });
});
