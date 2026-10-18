import { learnerDashboardAnalyticsSchema, type LearnerDashboardAnalytics } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class LearnerDashboardClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  async getAnalytics(): Promise<LearnerDashboardAnalytics> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/me/dashboard`, { method: 'GET', credentials: 'include', cache: 'no-store' });
    } catch {
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
    return learnerDashboardAnalyticsSchema.parse(await response.json());
  }
}

export const learnerDashboardClient = new LearnerDashboardClient();
