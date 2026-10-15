import { ieltsMockAttemptSchema, ieltsMockCatalogSchema, ieltsMockReportSchema, type IeltsMockAttemptDto, type IeltsMockReportDto } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });
export class IeltsMockClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  catalog() { return this.request('/me/ielts-mocks', { method: 'GET' }, ieltsMockCatalogSchema); }
  start(input: { clientAttemptId: string; mockTestId: string; mode: 'LEARNING' | 'PRACTICE' | 'EXAM_SIMULATION' }): Promise<IeltsMockAttemptDto> { return this.request('/me/ielts-mocks/attempts', { method: 'POST', body: JSON.stringify(input) }, ieltsMockAttemptSchema); }
  get(id: string): Promise<IeltsMockAttemptDto> { return this.request(`/me/ielts-mocks/attempts/${id}`, { method: 'GET' }, ieltsMockAttemptSchema); }
  save(id: string, input: { expectedRevision: number; responses: Record<string, string> }): Promise<IeltsMockAttemptDto> { return this.request(`/me/ielts-mocks/attempts/${id}/responses`, { method: 'PUT', body: JSON.stringify(input) }, ieltsMockAttemptSchema); }
  submit(id: string, section: string, expectedRevision: number): Promise<IeltsMockAttemptDto> { return this.request(`/me/ielts-mocks/attempts/${id}/sections/${section}/submit`, { method: 'POST', body: JSON.stringify({ expectedRevision }) }, ieltsMockAttemptSchema); }
  report(id: string): Promise<IeltsMockReportDto> { return this.request(`/me/ielts-mocks/attempts/${id}/report`, { method: 'GET' }, ieltsMockReportSchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response; try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); } catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); }
    if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); }
    return schema.parse(await response.json());
  }
}
export const ieltsMockClient = new IeltsMockClient();
