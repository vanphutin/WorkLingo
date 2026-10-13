import {
  ieltsIntegratedAvailabilitySchema, ieltsIntegratedProgressResultSchema, ieltsIntegratedSessionSchema,
  type IeltsIntegratedAvailabilityDto, type IeltsIntegratedProgressResult, type IeltsIntegratedSessionDto,
  type StartIeltsIntegratedSessionInput, type UpdateIeltsIntegratedProgressInput,
} from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class IeltsIntegratedClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  availability(): Promise<IeltsIntegratedAvailabilityDto> { return this.request('/me/ielts-integrated/availability', { method: 'GET' }, ieltsIntegratedAvailabilitySchema); }
  start(input: StartIeltsIntegratedSessionInput): Promise<IeltsIntegratedSessionDto> { return this.request('/me/ielts-integrated/sessions', { method: 'POST', body: JSON.stringify(input) }, ieltsIntegratedSessionSchema); }
  get(sessionId: string): Promise<IeltsIntegratedSessionDto> { return this.request(`/me/ielts-integrated/sessions/${sessionId}`, { method: 'GET' }, ieltsIntegratedSessionSchema); }
  update(sessionId: string, input: UpdateIeltsIntegratedProgressInput): Promise<IeltsIntegratedProgressResult> { return this.request(`/me/ielts-integrated/sessions/${sessionId}/progress`, { method: 'PUT', body: JSON.stringify(input) }, ieltsIntegratedProgressResultSchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); }
    catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); }
    if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); }
    return schema.parse(await response.json());
  }
}
export const ieltsIntegratedClient = new IeltsIntegratedClient();
