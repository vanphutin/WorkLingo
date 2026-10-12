import { describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SafeExceptionFilter } from './safe-exception.filter.js';
import { SafeLoggerService } from '../logging/safe-logger.service.js';

describe('SafeExceptionFilter', () => {
  const createMockHost = (req: Partial<Request>, res: Partial<Response>): ArgumentsHost => {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
        getResponse: () => res as Response,
      }),
    } as unknown as ArgumentsHost;
  };

  it('formats known domain HttpException and preserves code, message, details and correlationId', () => {
    const logger = new SafeLoggerService();
    const filter = new SafeExceptionFilter(logger);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const setHeader = vi.fn();

    const req = {
      correlationId: 'test-corr-id-123',
      method: 'POST',
      url: '/api/v1/learning-sessions',
    } as unknown as Request;

    const res = {
      headersSent: false,
      json,
      setHeader,
      status,
    } as unknown as Response;

    const host = createMockHost(req, res);

    const exception = new HttpException(
      {
        code: 'CURRICULUM_NOT_PLAYABLE',
        details: [{ reason: 'Missing audio' }],
        message: 'Mission cannot be played',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-corr-id-123');
    expect(json).toHaveBeenCalledWith({
      code: 'CURRICULUM_NOT_PLAYABLE',
      correlationId: 'test-corr-id-123',
      details: [{ reason: 'Missing audio' }],
      message: 'Mission cannot be played',
      statusCode: 422,
    });
  });

  it('flattens legacy nested domain error details into the safe error envelope', () => {
    const logger = new SafeLoggerService();
    const filter = new SafeExceptionFilter(logger);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const req = {
      correlationId: 'corr-content-422',
      method: 'POST',
      url: '/api/v1/admin/content-imports/import-id/validate',
    } as unknown as Request;
    const res = {
      headersSent: false,
      json,
      setHeader: vi.fn(),
      status,
    } as unknown as Response;

    const details = [{ code: 'VAL_REQUIRED_FIELD', message: "Lesson 'title' is required" }];
    const exception = new HttpException(
      {
        code: 'CONTENT_VALIDATION_FAILED',
        error: {
          code: 'CONTENT_VALIDATION_FAILED',
          details,
          message: 'Lesson source contains validation errors.',
        },
        message: 'Lesson source contains validation errors.',
        statusCode: 422,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, createMockHost(req, res));

    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'CONTENT_VALIDATION_FAILED',
      details,
      message: 'Lesson source contains validation errors.',
      statusCode: 422,
    }));
  });

  it('handles standard NestJS ValidationPipe BadRequestException', () => {
    const logger = new SafeLoggerService();
    const filter = new SafeExceptionFilter(logger);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const setHeader = vi.fn();

    const req = {
      correlationId: 'corr-val-456',
      method: 'POST',
      url: '/api/v1/auth/login',
    } as unknown as Request;

    const res = {
      headersSent: false,
      json,
      setHeader,
      status,
    } as unknown as Response;

    const host = createMockHost(req, res);

    const exception = new BadRequestException([
      'email must be an email',
      'password must be longer than 8 characters',
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        correlationId: 'corr-val-456',
        statusCode: 400,
      }),
    );
  });

  it('masks unexpected errors with 500 INTERNAL_SERVER_ERROR and never leaks stack or database internals', () => {
    const logger = new SafeLoggerService();
    const filter = new SafeExceptionFilter(logger);

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const setHeader = vi.fn();

    const req = {
      correlationId: 'corr-err-789',
      method: 'GET',
      url: '/api/v1/me/progress',
    } as unknown as Request;

    const res = {
      headersSent: false,
      json,
      setHeader,
      status,
    } as unknown as Response;

    const host = createMockHost(req, res);

    const secretDbError = new Error(
      'FATAL: password authentication failed for user postgres at 10.0.0.1:5432',
    );
    secretDbError.stack = 'Secret stack trace at PrismaClient.execute...';

    filter.catch(secretDbError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      correlationId: 'corr-err-789',
      message: 'An unexpected internal error occurred.',
      statusCode: 500,
    });
    // Never expose stack or password error to client response
    const responsePayload = JSON.stringify(json.mock.calls[0]);
    expect(responsePayload).not.toContain('password authentication failed');
    expect(responsePayload).not.toContain('PrismaClient');
  });
});
