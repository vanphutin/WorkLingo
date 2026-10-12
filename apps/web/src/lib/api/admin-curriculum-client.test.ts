import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminCurriculumClient, AdminCurriculumClient } from './admin-curriculum-client';

describe('AdminCurriculumClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetches complete curriculum tree', async () => {
    const mockTree = {
      paths: [
        {
          archiveBlockers: [],
          id: '11111111-1111-4111-8111-111111111111',
          levels: [],
          name: 'General English',
          program: {
            availabilityStatus: 'AVAILABLE',
            id: '10000000-0000-4000-8000-000000000002',
            name: 'Intermediate',
            slug: 'intermediate',
          },
          revision: 1,
          slug: 'general-english',
          status: 'PUBLISHED',
        },
      ],
      programs: [
        {
          availabilityStatus: 'AVAILABLE',
          id: '10000000-0000-4000-8000-000000000002',
          name: 'Intermediate',
          slug: 'intermediate',
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => mockTree,
      ok: true,
      status: 200,
    } as unknown as Response);

    const client = new AdminCurriculumClient('/api/v1');
    const result = await client.getTree();

    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]!.name).toBe('General English');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/curriculum',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );
  });

  it('creates learning path with idempotency payload', async () => {
    const pathInput = {
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
      name: 'Business English',
      programId: '10000000-0000-4000-8000-000000000002',
      slug: 'business-english',
    };

    const mockResponse = {
      archiveBlockers: [],
      id: '33333333-3333-4333-8333-333333333333',
      levels: [],
      name: 'Business English',
      program: {
        availabilityStatus: 'AVAILABLE',
        id: '10000000-0000-4000-8000-000000000002',
        name: 'Intermediate',
        slug: 'intermediate',
      },
      revision: 1,
      slug: 'business-english',
      status: 'DRAFT',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => mockResponse,
      ok: true,
      status: 201,
    } as unknown as Response);

    const client = new AdminCurriculumClient('/api/v1');
    const result = await client.createPath(pathInput);

    expect(result.id).toBe('33333333-3333-4333-8333-333333333333');
    expect(result.status).toBe('DRAFT');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/admin/curriculum/paths',
      expect.objectContaining({
        body: JSON.stringify(pathInput),
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('publishes a mission and returns updated item', async () => {
    const missionId = '44444444-4444-4444-8444-444444444444';
    const publishInput = {
      expectedRevision: 1,
      idempotencyKey: '55555555-5555-4555-8555-555555555555',
    };

    const mockResponse = {
      archiveBlockers: [],
      id: missionId,
      isPlayable: true,
      lessons: [],
      levelId: '66666666-6666-4666-8666-666666666666',
      objective: 'Master greetings',
      order: 1,
      playabilityReasons: [],
      purpose: 'LEARNING',
      revision: 2,
      slug: 'greetings',
      status: 'PUBLISHED',
      title: 'Greetings Mission',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => mockResponse,
      ok: true,
      status: 200,
    } as unknown as Response);

    const result = await adminCurriculumClient.publishMission(missionId, publishInput);
    expect(result.status).toBe('PUBLISHED');
    expect(result.revision).toBe(2);
  });

  it('throws ApiError on conflict with server error details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        code: 'CURRICULUM_REVISION_CONFLICT',
        message: 'Revision mismatch',
        statusCode: 409,
      }),
      ok: false,
      status: 409,
    } as unknown as Response);

    const client = new AdminCurriculumClient('/api/v1');
    await expect(
      client.publishPath('11111111-1111-4111-8111-111111111111', {
        expectedRevision: 1,
        idempotencyKey: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toThrow('Revision mismatch');
  });
});
