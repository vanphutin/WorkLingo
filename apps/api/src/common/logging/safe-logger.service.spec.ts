import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SafeLoggerService } from './safe-logger.service.js';

describe('SafeLoggerService', () => {
  let stdoutWriteSpy: { mockRestore: () => void };
  let capturedLogs: string[] = [];

  beforeEach(() => {
    capturedLogs = [];
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      capturedLogs.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    stdoutWriteSpy.mockRestore();
  });

  it('redacts sensitive keys regardless of case and redacts emails and bearer tokens', () => {
    const logger = new SafeLoggerService();

    logger.log('User login processed', {
      Email: 'learner.jane@company.org',
      Password: 'SuperSecret123!',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      cookie: 'sessionId=abc123secret; auth_token=xyz999',
      nested: {
        apiKey: 'sk-1234567890abcdef',
        refreshToken: 'rt-secret-token-val',
        learnerId: '11111111-1111-4111-8111-111111111111',
      },
    });

    const output = capturedLogs.join('');
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('SuperSecret123!');
    expect(output).not.toContain('learner.jane@company.org');
    expect(output).not.toContain('sk-1234567890abcdef');
    expect(output).not.toContain('rt-secret-token-val');
    // Non-sensitive data remains intact
    expect(output).toContain('11111111-1111-4111-8111-111111111111');
  });

  it('handles cyclic object references without throwing or hanging', () => {
    const logger = new SafeLoggerService();

    const cyclicObj: Record<string, unknown> = { name: 'cyclic-test' };
    cyclicObj['self'] = cyclicObj;

    expect(() => {
      logger.warn('Cyclic test warning', cyclicObj);
    }).not.toThrow();

    const output = capturedLogs.join('');
    expect(output).toContain('[CIRCULAR]');
  });

  it('truncates oversized strings and caps deep object nesting', () => {
    const logger = new SafeLoggerService();

    // Deep object: 15 levels deep
    let deep: Record<string, unknown> = { leaf: 'deep value' };
    for (let i = 0; i < 15; i++) {
      deep = { level: i, next: deep };
    }

    const hugeString = 'A'.repeat(5000);

    expect(() => {
      logger.error('Deep error', 'trace dummy', {
        deep,
        longText: hugeString,
      });
    }).not.toThrow();

    const output = capturedLogs.join('');
    expect(output).toContain('[MAX_DEPTH_REACHED]');
    expect(output).toContain('[TRUNCATED');
    expect(output).not.toContain('A'.repeat(2000));
  });

  it('redacts infrastructure locations, credentials, and learner-authored content', () => {
    const logger = new SafeLoggerService();

    logger.error(
      'FATAL: password authentication failed for user postgres at 10.0.0.1:5432',
      'postgresql://postgres:top-secret@10.0.0.1:5432/worklingo',
      {
        rawResponse: 'My private workplace answer',
        transcript: 'A private spoken response',
      },
    );

    const output = capturedLogs.join('');
    expect(output).not.toContain('10.0.0.1');
    expect(output).not.toContain('top-secret');
    expect(output).not.toContain('My private workplace answer');
    expect(output).not.toContain('A private spoken response');
    expect(output).not.toContain('user postgres');
  });
});
