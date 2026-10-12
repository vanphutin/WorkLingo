import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  CorrelationIdMiddleware,
  getCorrelationId,
} from './correlation-id.middleware.js';

describe('CorrelationIdMiddleware', () => {
  it('accepts valid bounded inbound UUID or ASCII correlation ID and sets response header', () => {
    const middleware = new CorrelationIdMiddleware();
    const inboundId = 'valid-request-id_12345';

    const req = {
      headers: {
        'x-correlation-id': inboundId,
      },
    } as unknown as Request;

    const setHeader = vi.fn();
    const res = {
      setHeader,
    } as unknown as Response;

    const next = vi.fn();

    middleware.use(req, res, next);

    expect(getCorrelationId(req)).toBe(inboundId);
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-ID', inboundId);
    expect(next).toHaveBeenCalled();
  });

  it('accepts x-request-id as fallback when x-correlation-id is absent', () => {
    const middleware = new CorrelationIdMiddleware();
    const inboundId = 'req-abc-987';

    const req = {
      headers: {
        'x-request-id': inboundId,
      },
    } as unknown as Request;

    const setHeader = vi.fn();
    const res = {
      setHeader,
    } as unknown as Response;

    const next = vi.fn();

    middleware.use(req, res, next);

    expect(getCorrelationId(req)).toBe(inboundId);
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-ID', inboundId);
  });

  it('generates a new UUID when inbound correlation ID is missing, non-ASCII, or oversized', () => {
    const middleware = new CorrelationIdMiddleware();

    const testCases = [
      undefined,
      '   ',
      'id-with-hướng-dẫn-tiếng-việt',
      'a'.repeat(65), // > 64 chars
      'id;with<invalid>characters',
    ];

    for (const invalidId of testCases) {
      const req = {
        headers: invalidId ? { 'x-correlation-id': invalidId } : {},
      } as unknown as Request;

      const setHeader = vi.fn();
      const res = { setHeader } as unknown as Response;
      const next = vi.fn();

      middleware.use(req, res, next);

      const generatedId = getCorrelationId(req);
      expect(generatedId).toBeDefined();
      expect(generatedId).not.toBe(invalidId);
      // Valid UUID format
      expect(generatedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(setHeader).toHaveBeenCalledWith('X-Correlation-ID', generatedId);
    }
  });
});
