import {
  adminOrientationSchema,
  orientationMediaAssetSchema,
  orientationValidationResultSchema,
  publishOrientationResultSchema,
  type AdminOrientationDto,
  type OrientationMediaAssetDto,
  type OrientationMediaKind,
  type OrientationValidationResult,
  type PublishOrientationInput,
  type PublishOrientationResult,
  type UpdateOrientationDraftInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

export class AdminIeltsOrientationClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  get(): Promise<AdminOrientationDto> {
    return this.request('/admin/ielts-orientation', { method: 'GET' }, adminOrientationSchema);
  }

  updateDraft(input: UpdateOrientationDraftInput): Promise<AdminOrientationDto> {
    return this.request('/admin/ielts-orientation/draft', { method: 'PUT', body: JSON.stringify(input) }, adminOrientationSchema);
  }

  validate(input: { expectedRevision: number }): Promise<OrientationValidationResult> {
    return this.request('/admin/ielts-orientation/validate', { method: 'POST', body: JSON.stringify(input) }, orientationValidationResultSchema);
  }

  publish(input: PublishOrientationInput): Promise<PublishOrientationResult> {
    return this.request('/admin/ielts-orientation/publish', { method: 'POST', body: JSON.stringify(input) }, publishOrientationResultSchema);
  }

  archive(): Promise<AdminOrientationDto> {
    return this.request('/admin/ielts-orientation/archive', { method: 'POST' }, adminOrientationSchema);
  }

  async uploadMedia(kind: OrientationMediaKind, file: File): Promise<OrientationMediaAssetDto> {
    const body = new FormData();
    body.set('kind', kind);
    body.set('file', file);
    return this.request('/admin/ielts-orientation/media', { method: 'POST', body }, orientationMediaAssetSchema);
  }

  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      const headers = new Headers(options.headers);
      if (!(options.body instanceof FormData)) headers.set('content-type', 'application/json');
      response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers });
    } catch (error) {
      throw new ApiError({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network request failed', status: 0 });
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const message = parsed.success && parsed.data.message
        ? Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message
        : `Request failed with status ${response.status}`;
      throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status });
    }
    return schema.parse(await response.json());
  }
}

export const adminIeltsOrientationClient = new AdminIeltsOrientationClient();
