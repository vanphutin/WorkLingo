import {
  BadRequestException,
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { SafeLoggerService } from '../logging/safe-logger.service.js';
import { getCorrelationId } from '../request-context/correlation-id.middleware.js';

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'UNPROCESSABLE_ENTITY';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR';
  }
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(SafeLoggerService)
    private readonly logger: SafeLoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const correlationId = getCorrelationId(req);
    if (correlationId && !res.headersSent) {
      res.setHeader('X-Correlation-ID', correlationId);
    }

    if (exception instanceof Error && exception.name === 'MulterError' &&
      'code' in exception && exception.code === 'LIMIT_FIELD_ARRAY_INDEX') {
      exception = new BadRequestException('Invalid multipart field.');
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawResponse = exception.getResponse();

      let code = defaultCodeForStatus(status);
      let message = exception.message;
      let details: unknown[] | undefined;
      const extra: Record<string, unknown> = {};

      if (typeof rawResponse === 'string') {
        message = rawResponse;
      } else if (typeof rawResponse === 'object' && rawResponse !== null) {
        const payload = rawResponse as Record<string, unknown>;
        const nestedError = typeof payload.error === 'object' && payload.error !== null
          ? payload.error as Record<string, unknown>
          : null;
        if (typeof payload.code === 'string') {
          code = payload.code;
        } else if (typeof nestedError?.code === 'string') {
          code = nestedError.code;
        }
        if (payload.message) {
          message = Array.isArray(payload.message)
            ? payload.message.join('; ')
            : String(payload.message);
        } else if (nestedError?.message) {
          message = String(nestedError.message);
        }
        if (Array.isArray(payload.details)) {
          details = payload.details;
        } else if (Array.isArray(nestedError?.details)) {
          details = nestedError.details;
        }
        for (const [key, val] of Object.entries(payload)) {
          if (!['code', 'message', 'details', 'error', 'statusCode'].includes(key)) {
            extra[key] = val;
          }
        }
      }

      if (status >= 500) {
        this.logger.error(
          `HTTP ${status} Exception: ${message}`,
          exception.stack,
          { correlationId, method: req.method, path: req.url },
        );
      }

      res.status(status).json({
        code,
        correlationId,
        details,
        message,
        statusCode: status,
        ...extra,
      });
      return;
    }

    // Unexpected error (Internal Server Error)
    const err = exception instanceof Error ? exception : new Error(String(exception));

    this.logger.error(
      `Unhandled error on ${req.method} ${req.url}: ${err.message}`,
      err.stack,
      { correlationId, method: req.method, path: req.url },
    );

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      correlationId,
      message: 'An unexpected internal error occurred.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
