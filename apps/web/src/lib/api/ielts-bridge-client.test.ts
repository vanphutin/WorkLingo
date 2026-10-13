import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IeltsBridgeClient } from './ielts-bridge-client';

const moduleId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const progress = {
  moduleId, moduleVersionId: versionId, currentStageIndex: 0, revision: 1,
  startedAt: new Date().toISOString(), completedAt: null, timedStageStartedAt: null,
  timedStageDeadlineAt: null, stageResults: [],
};

describe('IeltsBridgeClient', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

  it('uses catalog, start, resume and optimistic progress endpoints', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ eligible: true, lockedReason: null, bridgeCompleted: false, modules: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ module: null, progress })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ module: null, progress })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ progress: { ...progress, revision: 2 }, feedbackMessage: null })));
    const client = new IeltsBridgeClient('/api/v1');
    await client.catalog();
    await expect(client.start(moduleId)).rejects.toBeDefined();
    await expect(client.getSession(moduleId)).rejects.toBeDefined();
    await client.updateProgress(moduleId, { expectedRevision: 1, stageIndex: 0, completeStage: true });
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/me/ielts-bridge/catalog', expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(2, `/api/v1/me/ielts-bridge/modules/${moduleId}/start`, expect.objectContaining({ method: 'POST' }));
    expect(fetch).toHaveBeenNthCalledWith(3, `/api/v1/me/ielts-bridge/modules/${moduleId}/session`, expect.objectContaining({ method: 'GET' }));
    expect(fetch).toHaveBeenNthCalledWith(4, `/api/v1/me/ielts-bridge/modules/${moduleId}/progress`, expect.objectContaining({ method: 'PUT' }));
  });
});
