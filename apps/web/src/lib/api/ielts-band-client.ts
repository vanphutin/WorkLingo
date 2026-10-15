import {
  ieltsBandPathwayAvailabilitySchema,
  ieltsBandPathwaySchema,
  type IeltsBandPathwayAvailabilityDto,
  type IeltsBandPathwayDto,
} from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });

export class IeltsBandClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  availability(): Promise<IeltsBandPathwayAvailabilityDto> { return this.request('/me/ielts-band-pathway', { method: 'GET' }, ieltsBandPathwayAvailabilitySchema); }
  start(input: { clientJourneyId: string; targetBand: number }): Promise<IeltsBandPathwayDto> { return this.request('/me/ielts-band-pathway/start', { method: 'POST', body: JSON.stringify(input) }, ieltsBandPathwaySchema); }
  updateTarget(input: { expectedRevision: number; targetBand: number }): Promise<IeltsBandPathwayDto> { return this.request('/me/ielts-band-pathway/target', { method: 'PUT', body: JSON.stringify(input) }, ieltsBandPathwaySchema); }
  evaluate(input: { expectedRevision: number }): Promise<IeltsBandPathwayDto> { return this.request('/me/ielts-band-pathway/evaluate', { method: 'POST', body: JSON.stringify(input) }, ieltsBandPathwaySchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); }
    catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); }
    if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); }
    return schema.parse(await response.json());
  }
}
export const ieltsBandClient = new IeltsBandClient();
