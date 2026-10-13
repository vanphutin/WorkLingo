import {
  adminIeltsBridgeModuleSchema,
  ieltsBridgeValidationResultSchema,
  publishIeltsBridgeResultSchema,
  type AdminIeltsBridgeModuleDto,
  type IeltsBridgeCommandInput,
  type IeltsBridgeValidationResult,
  type PublishIeltsBridgeResult,
  type SaveIeltsBridgeDraftInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
});
const moduleListSchema = z.array(adminIeltsBridgeModuleSchema);

export class AdminIeltsBridgeClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  list(): Promise<AdminIeltsBridgeModuleDto[]> {
    return this.request('/admin/ielts-bridge/modules', { method: 'GET' }, moduleListSchema);
  }

  get(moduleId: string): Promise<AdminIeltsBridgeModuleDto> {
    return this.request(`/admin/ielts-bridge/modules/${moduleId}`, { method: 'GET' }, adminIeltsBridgeModuleSchema);
  }

  create(input: SaveIeltsBridgeDraftInput): Promise<AdminIeltsBridgeModuleDto> {
    return this.request('/admin/ielts-bridge/modules', { method: 'POST', body: JSON.stringify(input) }, adminIeltsBridgeModuleSchema);
  }

  updateDraft(moduleId: string, input: SaveIeltsBridgeDraftInput): Promise<AdminIeltsBridgeModuleDto> {
    return this.request(`/admin/ielts-bridge/modules/${moduleId}/draft`, { method: 'PUT', body: JSON.stringify(input) }, adminIeltsBridgeModuleSchema);
  }

  validate(moduleId: string, input: IeltsBridgeCommandInput): Promise<IeltsBridgeValidationResult> {
    return this.request(`/admin/ielts-bridge/modules/${moduleId}/validate`, { method: 'POST', body: JSON.stringify(input) }, ieltsBridgeValidationResultSchema);
  }

  publish(moduleId: string, input: IeltsBridgeCommandInput): Promise<PublishIeltsBridgeResult> {
    return this.request(`/admin/ielts-bridge/modules/${moduleId}/publish`, { method: 'POST', body: JSON.stringify(input) }, publishIeltsBridgeResultSchema);
  }

  archive(moduleId: string): Promise<AdminIeltsBridgeModuleDto> {
    return this.request(`/admin/ielts-bridge/modules/${moduleId}/archive`, { method: 'POST' }, adminIeltsBridgeModuleSchema);
  }

  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      const headers = new Headers(options.headers);
      headers.set('content-type', 'application/json');
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

export const adminIeltsBridgeClient = new AdminIeltsBridgeClient();
