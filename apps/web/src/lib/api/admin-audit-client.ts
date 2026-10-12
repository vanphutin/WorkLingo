import {
  adminAuditPageSchema,
  type AdminAuditFilterInput,
  type AdminAuditPageDto,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
});

export class AdminAuditClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(
      /\/+$/u,
      '',
    );
  }

  async getEvents(filters?: Partial<AdminAuditFilterInput>): Promise<AdminAuditPageDto> {
    const searchParams = new URLSearchParams();

    if (filters) {
      if (filters.action) searchParams.set('action', filters.action);
      if (filters.actorId) searchParams.set('actorId', filters.actorId);
      if (filters.cursor) searchParams.set('cursor', filters.cursor);
      if (filters.from) searchParams.set('from', filters.from);
      if (filters.limit) searchParams.set('limit', String(filters.limit));
      if (filters.resourceId) searchParams.set('resourceId', filters.resourceId);
      if (filters.resourceType) searchParams.set('resourceType', filters.resourceType);
      if (filters.to) searchParams.set('to', filters.to);
    }

    const qs = searchParams.toString();
    const path = qs ? `/admin/audit-events?${qs}` : '/admin/audit-events';

    return this.request(path, { method: 'GET' }, adminAuditPageSchema);
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        credentials: 'include',
      });
    } catch (error) {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      });
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as unknown;
      const parsed = errorSchema.safeParse(payload);
      const message =
        parsed.success && parsed.data.message
          ? Array.isArray(parsed.data.message)
            ? parsed.data.message.join('; ')
            : parsed.data.message
          : `Request failed with status ${response.status}`;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message,
        status: response.status,
      });
    }

    return schema.parse(await response.json());
  }
}

export const adminAuditClient = new AdminAuditClient();
