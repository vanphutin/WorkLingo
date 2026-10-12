import { describe, expect, it } from 'vitest';
import { sanitizeAuditState } from './audit-metadata-policy.js';

describe('AuditMetadataPolicy', () => {
  it('preserves allowlisted curriculum and audit metadata fields', () => {
    const input = {
      action: 'UPDATE_MISSION',
      actorId: '11111111-1111-4111-8111-111111111111',
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Foundation Path',
      objective: 'Master greetings',
      order: 1,
      purpose: 'LEARNING',
      resourceType: 'PATH',
      revision: 2,
      slug: 'foundation-1',
      status: 'PUBLISHED',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual(input);
  });

  it('removes or redacts forbidden credentials and tokens', () => {
    const input = {
      apiKey: 'secret_key_12345',
      authorization: 'Bearer jwt.token.here',
      cookie: 'session_cookie=abcdef',
      id: 'item-1',
      name: 'Safe Name',
      password: 'mypassword123',
      passwordHash: '$argon2id$v=19$m=65536...',
      token: 'sensitive-token',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual({
      id: 'item-1',
      name: 'Safe Name',
    });
    expect(sanitized).not.toHaveProperty('password');
    expect(sanitized).not.toHaveProperty('passwordHash');
    expect(sanitized).not.toHaveProperty('token');
    expect(sanitized).not.toHaveProperty('cookie');
    expect(sanitized).not.toHaveProperty('apiKey');
    expect(sanitized).not.toHaveProperty('authorization');
  });

  it('removes raw content, learner responses, transcripts and audio bytes', () => {
    const input = {
      audio: Buffer.from('fake-audio'),
      audioBytes: [1, 2, 3],
      id: 'lesson-1',
      learnerResponse: 'I am speaking here',
      rawSource: '=== LESSON: Title ===',
      recording: { duration: 10, url: 's3://...' },
      sourceText: 'Hello world transcript',
      title: 'Greetings',
      transcript: 'Full audio transcript text',
      writing: 'My essay submission',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual({
      id: 'lesson-1',
      title: 'Greetings',
    });
    expect(sanitized).not.toHaveProperty('sourceText');
    expect(sanitized).not.toHaveProperty('rawSource');
    expect(sanitized).not.toHaveProperty('learnerResponse');
    expect(sanitized).not.toHaveProperty('transcript');
    expect(sanitized).not.toHaveProperty('writing');
    expect(sanitized).not.toHaveProperty('recording');
    expect(sanitized).not.toHaveProperty('audio');
  });

  it('removes provider payloads and unredacted provider errors', () => {
    const input = {
      id: 'job-1',
      providerError: 'Internal OpenAI raw error 500: {...}',
      providerPayload: { model: 'gpt-4o', prompt: 'Secret prompt' },
      status: 'FAILED',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual({
      id: 'job-1',
      status: 'FAILED',
    });
    expect(sanitized).not.toHaveProperty('providerPayload');
    expect(sanitized).not.toHaveProperty('providerError');
  });

  it('redacts email addresses to preserve privacy', () => {
    const input = {
      actorDisplayName: 'Content Admin',
      email: 'admin@worklingo.vn',
      id: 'user-1',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual({
      actorDisplayName: 'Content Admin',
      id: 'user-1',
    });
    expect(sanitized).not.toHaveProperty('email');
  });

  it('handles nested objects and filters forbidden keys at all levels', () => {
    const input = {
      child: {
        deeper: {
          password: 'nested-secret',
          safeField: 'retained',
        },
        id: 'child-1',
        token: 'nested-token',
      },
      id: 'root-1',
    };

    const sanitized = sanitizeAuditState(input);
    expect(sanitized).toEqual({
      child: {
        deeper: {
          safeField: 'retained',
        },
        id: 'child-1',
      },
      id: 'root-1',
    });
  });

  it('handles cyclic data structures without stack overflow', () => {
    const cyclicObj: Record<string, unknown> = {
      id: 'cyclic-root',
      name: 'Loop test',
    };
    cyclicObj.self = cyclicObj;

    const sanitized = sanitizeAuditState(cyclicObj);
    expect(sanitized).toBeDefined();
    expect(sanitized?.id).toBe('cyclic-root');
    expect(sanitized?.name).toBe('Loop test');
    expect(sanitized?.self).toBeUndefined();
  });

  it('bounds recursion depth and truncates oversized strings', () => {
    const deepObj = {
      l1: {
        l2: {
          l3: {
            l4: {
              l5: {
                l6: 'too deep',
              },
            },
          },
        },
      },
    };

    const sanitized = sanitizeAuditState(deepObj);
    // Depth beyond 4 should be omitted or pruned
    expect(sanitized).toBeDefined();

    const longString = 'a'.repeat(2000);
    const sanitizedString = sanitizeAuditState({ id: 'long', description: longString });
    expect(typeof sanitizedString?.description).toBe('string');
    expect((sanitizedString?.description as string).length).toBeLessThanOrEqual(500);
  });

  it('handles null, undefined, primitives and arrays safely', () => {
    expect(sanitizeAuditState(null)).toBeNull();
    expect(sanitizeAuditState(undefined)).toBeNull();
    expect(sanitizeAuditState('string' as unknown as Record<string, unknown>)).toBeNull();
  });
});
