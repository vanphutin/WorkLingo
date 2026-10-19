import { dashboardOverviewSchema, learnerDashboardAnalyticsSchema, type DashboardOverview, type LearnerDashboardAnalytics } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class LearnerDashboardClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  async getAnalytics(): Promise<LearnerDashboardAnalytics> {
    return this.request('/me/dashboard', learnerDashboardAnalyticsSchema);
  }

  async getOverview(signal?: AbortSignal): Promise<DashboardOverview> {
    return this.request('/me/dashboard/overview', dashboardOverviewSchema, signal);
  }

  private async request<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { method: 'GET', credentials: 'include', cache: 'no-store', ...(signal ? { signal } : {}) });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'Unable to reach dashboard insights.' });
    }
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const parsed = errorSchema.safeParse(payload);
      const message = parsed.success ? parsed.data.message : undefined;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        status: response.status,
        message: Array.isArray(message) ? message.join('; ') : message ?? 'Unable to load dashboard insights.',
      });
    }
    return schema.parse(await response.json());
  }
}

export const learnerDashboardClient = new LearnerDashboardClient();
