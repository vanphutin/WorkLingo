import { adminIeltsMockSchema, ieltsMockReportSchema, ieltsMockValidationSchema, publishIeltsMockResultSchema } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const pendingSchema = z.array(z.object({ id: z.string(), learnerId: z.string(), revision: z.number(), responses: z.record(z.string(), z.string()), submittedAt: z.union([z.string(), z.date(), z.null()]), mockTestVersion: z.object({ version: z.number() }) }));
const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });
export class AdminIeltsMockClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  list(offset = 0) { return this.request(`/admin/ielts-mocks?offset=${offset}`, { method: 'GET' }, z.array(adminIeltsMockSchema)); }
  save(id: string, input: { expectedRevision: number; idempotencyKey: string; content: unknown }) { return this.request(`/admin/ielts-mocks/${id}/draft`, { method: 'PUT', body: JSON.stringify(input) }, adminIeltsMockSchema); }
  validate(id: string, expectedRevision: number) { return this.request(`/admin/ielts-mocks/${id}/validate`, { method: 'POST', body: JSON.stringify({ expectedRevision, idempotencyKey: crypto.randomUUID() }) }, ieltsMockValidationSchema); }
  publish(id: string, expectedRevision: number) { return this.request(`/admin/ielts-mocks/${id}/publish`, { method: 'POST', body: JSON.stringify({ expectedRevision, idempotencyKey: crypto.randomUUID() }) }, publishIeltsMockResultSchema); }
  pending(offset = 0) { return this.request(`/admin/ielts-mock-attempts?offset=${offset}`, { method: 'GET' }, pendingSchema); }
  review(id: string, input: unknown) { return this.request(`/admin/ielts-mock-attempts/${id}/reviews`, { method: 'POST', body: JSON.stringify(input) }, ieltsMockReportSchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> { let response: Response; try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); } catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); } if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); } return schema.parse(await response.json()); }
}
export const adminIeltsMockClient = new AdminIeltsMockClient();
