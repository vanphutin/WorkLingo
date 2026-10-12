import {
  engagementSummarySchema,
  weeklyTargetInputSchema,
  type EngagementSummaryDto,
  type WeeklyTargetInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
});

export class EngagementClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1')
      .replace(/\/+$/u, '');
  }

  async getSummary(): Promise<EngagementSummaryDto> {
    return this.request('/me/engagement', { method: 'GET' }, engagementSummarySchema);
  }

  async updateWeeklyTarget(targetDays: number): Promise<EngagementSummaryDto> {
    const payload: WeeklyTargetInput = weeklyTargetInputSchema.parse({ targetDays });
    return this.request(
      '/me/engagement/weekly-target',
      {
        body: JSON.stringify(payload),
        method: 'PATCH',
      },
      engagementSummarySchema,
    );
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      const requestOptions: RequestInit = {
        ...options,
        credentials: 'include',
      };
      if (options.body) requestOptions.headers = { 'content-type': 'application/json' };
      response = await fetch(`${this.baseUrl}${path}`, requestOptions);
    } catch (error) {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      });
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as unknown;
      const parsed = errorSchema.safeParse(payload);
      const message = parsed.success && parsed.data.message
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

export const engagementClient = new EngagementClient();
