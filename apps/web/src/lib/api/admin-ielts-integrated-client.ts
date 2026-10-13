import {
  adminIeltsIntegratedProfileSchema, ieltsIntegratedValidationResultSchema, publishIeltsIntegratedResultSchema,
  type AdminIeltsIntegratedProfileDto, type IeltsIntegratedCommandInput, type IeltsIntegratedValidationResult,
  type PublishIeltsIntegratedResult, type SaveIeltsIntegratedDraftInput,
} from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const listSchema = z.array(adminIeltsIntegratedProfileSchema);
const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });
export class AdminIeltsIntegratedClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  list(): Promise<AdminIeltsIntegratedProfileDto[]> { return this.request('/admin/ielts-integrated/profiles', { method: 'GET' }, listSchema); }
  update(id: string, input: SaveIeltsIntegratedDraftInput): Promise<AdminIeltsIntegratedProfileDto> { return this.request(`/admin/ielts-integrated/profiles/${id}/draft`, { method: 'PUT', body: JSON.stringify(input) }, adminIeltsIntegratedProfileSchema); }
  validate(id: string, input: IeltsIntegratedCommandInput): Promise<IeltsIntegratedValidationResult> { return this.request(`/admin/ielts-integrated/profiles/${id}/validate`, { method: 'POST', body: JSON.stringify(input) }, ieltsIntegratedValidationResultSchema); }
  publish(id: string, input: IeltsIntegratedCommandInput): Promise<PublishIeltsIntegratedResult> { return this.request(`/admin/ielts-integrated/profiles/${id}/publish`, { method: 'POST', body: JSON.stringify(input) }, publishIeltsIntegratedResultSchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); }
    catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); }
    if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); }
    return schema.parse(await response.json());
  }
}
export const adminIeltsIntegratedClient = new AdminIeltsIntegratedClient();
