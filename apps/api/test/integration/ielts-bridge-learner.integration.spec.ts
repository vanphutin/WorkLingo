import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { IELTS_BRIDGE_SEEDS, seedIeltsBridge } from '../../src/ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { IELTS_ORIENTATION_SEED } from '../../src/ielts-orientation/infrastructure/seed-ielts-orientation.js';
import { createLearningSessionTestContext, registerPendingLearner, type LearningSessionTestContext } from './learning-session-test-harness.js';

describe('IELTS Bridge learner API', () => {
  let context: LearningSessionTestContext;

  beforeAll(async () => {
    context = await createLearningSessionTestContext('ielts_bridge_learner');
    await seedIeltsBridge(context.database);
  }, 60_000);

  afterAll(async () => context?.close());

  it('gates new starts, pins a version, persists ten stages and protects owner data', async () => {
    const registration = await registerPendingLearner(context.app, {
      displayName: 'Bridge Learner', email: `bridge-learner-${randomUUID()}@test.local`,
    });
    await registration.agent.get('/api/v1/me/ielts-bridge/catalog').expect(200).expect(({ body }) => {
      expect(body).toEqual({ eligible: false, lockedReason: 'ORIENTATION_REQUIRED', bridgeCompleted: false, modules: [] });
    });

    const orientation = await context.database.ieltsOrientation.create({ data: {
      slug: 'ielts-orientation', draftContent: IELTS_ORIENTATION_SEED as Prisma.InputJsonValue, status: 'PUBLISHED',
    } });
    const orientationVersion = await context.database.ieltsOrientationVersion.create({ data: {
      orientationId: orientation.id, version: 1, title: IELTS_ORIENTATION_SEED.title,
      sourceHash: randomUUID(), content: IELTS_ORIENTATION_SEED as Prisma.InputJsonValue,
    } });
    await context.database.ieltsOrientation.update({
      where: { id: orientation.id }, data: { currentPublishedVersionId: orientationVersion.id },
    });
    await context.database.orientationProgress.create({ data: {
      learnerId: registration.user.id, orientationVersionId: orientationVersion.id,
      currentSlideIndex: IELTS_ORIENTATION_SEED.slides.length - 1, answers: [], completedAt: new Date(),
    } });

    const catalog = await registration.agent.get('/api/v1/me/ielts-bridge/catalog').expect(200);
    expect(catalog.body).toMatchObject({ eligible: true, lockedReason: null, bridgeCompleted: false });
    expect(catalog.body.modules).toHaveLength(4);
    const listening = catalog.body.modules.find((module: { questionType: string }) => module.questionType === 'listening_form_completion');
    expect(listening).toBeDefined();

    const started = await registration.agent.post(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/start`).expect(200);
    expect(started.body).toMatchObject({ module: { id: listening.moduleVersionId, version: 1 }, progress: { revision: 1, currentStageIndex: 0 } });
    expect(started.body.module.stages[2].task).not.toHaveProperty('answerIndex');
    expect(started.body.module.stages[6].task).not.toHaveProperty('rubric');

    const versionTwo = await context.database.ieltsBridgeModuleVersion.create({ data: {
      moduleId: listening.moduleId, version: 2, title: 'Changed listening bridge', skill: 'LISTENING',
      questionType: 'listening_form_completion', required: true, sourceHash: randomUUID(),
      content: { ...IELTS_BRIDGE_SEEDS[0], title: 'Changed listening bridge' } as Prisma.InputJsonValue,
    } });
    await context.database.ieltsBridgeModule.update({
      where: { id: listening.moduleId }, data: { currentPublishedVersionId: versionTwo.id },
    });
    await registration.agent.get(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/session`).expect(200).expect(({ body }) => {
      expect(body.module).toMatchObject({ id: listening.moduleVersionId, version: 1 });
    });

    const outsider = await registerPendingLearner(context.app, {
      displayName: 'Other Learner', email: `bridge-other-${randomUUID()}@test.local`,
    });
    await outsider.agent.get(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/session`).expect(404);

    let revision = 1;
    const answers: Record<number, unknown> = {
      2: 1, 4: 1, 5: 1, 6: 'The label needs a day; Tuesday is rejected and Thursday is the final preference.', 7: 1,
    };
    for (let stageIndex = 0; stageIndex < 10; stageIndex += 1) {
      if (stageIndex === 7) {
        const timer = await registration.agent.put(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/progress`)
          .send({ expectedRevision: revision, stageIndex, startTimer: true }).expect(200);
        revision = timer.body.progress.revision;
        expect(timer.body.progress.timedStageDeadlineAt).toEqual(expect.any(String));
      }
      const response = await registration.agent.put(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/progress`)
        .send({ expectedRevision: revision, stageIndex, completeStage: true, ...(stageIndex in answers ? { answer: answers[stageIndex] } : {}) })
        .expect(200);
      revision = response.body.progress.revision;
      if (stageIndex === 2) expect(response.body.feedbackMessage).toContain('Correct');
      if (stageIndex === 7) expect(response.body.progress.stageResults.at(-1)).toMatchObject({ timedOut: false, correct: true });
    }

    const completed = await registration.agent.get(`/api/v1/me/ielts-bridge/modules/${listening.moduleId}/session`).expect(200);
    expect(completed.body.progress).toMatchObject({ revision, currentStageIndex: 9 });
    expect(completed.body.progress.completedAt).toEqual(expect.any(String));
    expect(completed.body.progress.stageResults).toHaveLength(10);
    expect(JSON.stringify(completed.body)).not.toContain('answerIndex');
    expect(JSON.stringify(completed.body)).not.toContain('rubric');
  });
});
