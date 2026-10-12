import {
  adminJobDetailSchema,
  adminJobPageSchema,
  adminOperationsSummarySchema,
  type AdminJobDetailDto,
  type AdminJobPageDto,
  type AdminJobStatus,
  type AdminOperationsSummaryDto,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export interface AdminJobFilters {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: AdminJobStatus;
  readonly type?: string;
}

export class AdminOperationsClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  getSummary(): Promise<AdminOperationsSummaryDto> {
    return this.request('/admin/operations/summary', adminOperationsSummarySchema);
  }

  listJobs(filters: AdminJobFilters = {}): Promise<AdminJobPageDto> {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.status) params.set('status', filters.status);
    if (filters.type?.trim()) params.set('type', filters.type.trim());
    const query = params.toString();
    return this.request(`/admin/operations/jobs${query ? `?${query}` : ''}`, adminJobPageSchema);
  }

  getJob(id: string): Promise<AdminJobDetailDto> {
    return this.request(`/admin/operations/jobs/${encodeURIComponent(id)}`, adminJobDetailSchema);
  }

  private async request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { credentials: 'include' });
    } catch (error) {
      throw new ApiError({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network request failed', status: 0 });
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const rawMessage = parsed.success ? parsed.data.message : undefined;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message: Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage ?? `Request failed with status ${response.status}`,
        status: response.status,
      });
    }
    return schema.parse(await response.json());
  }
}

export const adminOperationsClient = new AdminOperationsClient();
