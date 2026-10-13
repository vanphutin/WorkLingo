import {
  orientationLearnerStatusSchema,
  orientationProgressResultSchema,
  type OrientationLearnerStatusDto,
  type OrientationProgressResult,
  type OrientationProgressUpdateInput,
} from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional(),
  reasons: z.array(z.string()).optional(),
});

export class IeltsOrientationClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }

  getStatus(): Promise<OrientationLearnerStatusDto> {
    return this.request('/me/ielts-orientation', { method: 'GET' }, orientationLearnerStatusSchema);
  }
  start(): Promise<OrientationLearnerStatusDto> {
    return this.request('/me/ielts-orientation/start', { method: 'POST' }, orientationLearnerStatusSchema);
  }
  updateProgress(input: OrientationProgressUpdateInput): Promise<OrientationProgressResult> {
    return this.request('/me/ielts-orientation/progress', { method: 'PUT', body: JSON.stringify(input) }, orientationProgressResultSchema);
  }

  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      const headers = new Headers(options.headers);
      if (options.body) headers.set('content-type', 'application/json');
      response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers });
    } catch (error) {
      throw new ApiError({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network request failed', status: 0 });
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const message = parsed.success && parsed.data.message
        ? Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message
        : `Request failed with status ${response.status}`;
      throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status, details: parsed.success ? parsed.data.reasons ?? [] : [] });
    }
    return schema.parse(await response.json());
  }
}

export const ieltsOrientationClient = new IeltsOrientationClient();
