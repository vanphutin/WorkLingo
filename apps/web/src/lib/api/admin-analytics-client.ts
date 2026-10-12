import {
  adminPilotAnalyticsResponseSchema,
  type AdminPilotAnalyticsResponse,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class AdminAnalyticsClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  async getPilotAnalytics(from: string, to: string): Promise<AdminPilotAnalyticsResponse> {
    const params = new URLSearchParams({ from, to });
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/admin/analytics/pilot?${params.toString()}`, { credentials: 'include' });
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
    return adminPilotAnalyticsResponseSchema.parse(await response.json());
  }
}

export const adminAnalyticsClient = new AdminAnalyticsClient();
