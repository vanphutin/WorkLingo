import { adminDashboardOverviewSchema, type AdminDashboardOverview } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class AdminDashboardClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  async getOverview(): Promise<AdminDashboardOverview> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/admin/analytics/overview`, { credentials: 'include', cache: 'no-store' });
    } catch (error) {
      throw new ApiError({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network request failed', status: 0 });
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const message = parsed.success ? parsed.data.message : undefined;
      throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', status: response.status,
        message: Array.isArray(message) ? message.join('; ') : message ?? `Request failed with status ${response.status}` });
    }
    return adminDashboardOverviewSchema.parse(await response.json());
  }
}

export const adminDashboardClient = new AdminDashboardClient();
