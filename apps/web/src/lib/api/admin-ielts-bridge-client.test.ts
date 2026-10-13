import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ieltsBridgeStageTypes } from '@worklingo/contracts';

import { AdminIeltsBridgeClient } from './admin-ielts-bridge-client';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

const moduleDto = {
  id: crypto.randomUUID(), slug: 'listening-form-completion', status: 'DRAFT' as const,
  draftRevision: 1, draft: {
    title: 'Listening form completion', description: 'Learn the strategy.', skill: 'listening' as const,
    questionType: 'listening_form_completion' as const, required: true,
    stages: ieltsBridgeStageTypes.map((type, index) => ({
      slug: type.replaceAll('_', '-'), type, title: `Stage ${index + 1}`, instruction: 'Use complete meaning.',
      strategySteps: ['Check the full evidence.'], timeLimitSeconds: type === 'timed_practice' ? 90 : null,
      task: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? { kind: 'single_choice' as const, prompt: 'Choose one.', options: ['A', 'B'], answerIndex: 0 }
        : { kind: 'instruction' as const },
      feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? { correct: 'Correct.', incorrect: 'Review the evidence.' } : null,
    })),
  }, currentPublishedVersion: null, versions: [],
  updatedAt: new Date().toISOString(),
};

describe('AdminIeltsBridgeClient', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('uses typed module authoring and publish endpoints', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response([moduleDto]))
      .mockResolvedValueOnce(response(moduleDto))
      .mockResolvedValueOnce(response({
        moduleId: moduleDto.id, moduleVersionId: crypto.randomUUID(), version: 1, publishedAt: new Date().toISOString(),
      }, 201));
    const client = new AdminIeltsBridgeClient('/api/v1');

    await client.list();
    await client.updateDraft(moduleDto.id, {
      expectedRevision: 1, idempotencyKey: crypto.randomUUID(), content: moduleDto.draft,
    });
    await client.publish(moduleDto.id, { expectedRevision: 1, idempotencyKey: crypto.randomUUID() });

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/admin/ielts-bridge/modules', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, `/api/v1/admin/ielts-bridge/modules/${moduleDto.id}/draft`, expect.objectContaining({ method: 'PUT' }));
    expect(fetch).toHaveBeenNthCalledWith(3, `/api/v1/admin/ielts-bridge/modules/${moduleDto.id}/publish`, expect.objectContaining({ method: 'POST' }));
  });
});
