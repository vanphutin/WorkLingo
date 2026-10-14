import {
  adminIeltsBandCurriculumSchema,
  ieltsBandCurriculumValidationSchema,
  publishIeltsBandCurriculumResultSchema,
  type AdminIeltsBandCurriculumDto,
  type IeltsBandCurriculumCommandInput,
  type IeltsBandCurriculumValidation,
  type PublishIeltsBandCurriculumResult,
  type SaveIeltsBandCurriculumDraftInput,
} from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';

const errorSchema = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional() });
export class AdminIeltsBandClient {
  private readonly baseUrl: string;
  constructor(baseUrl?: string) { this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, ''); }
  get(): Promise<AdminIeltsBandCurriculumDto> { return this.request('/admin/ielts-band-curriculum', { method: 'GET' }, adminIeltsBandCurriculumSchema); }
  save(input: SaveIeltsBandCurriculumDraftInput): Promise<AdminIeltsBandCurriculumDto> { return this.request('/admin/ielts-band-curriculum/draft', { method: 'PUT', body: JSON.stringify(input) }, adminIeltsBandCurriculumSchema); }
  validate(input: IeltsBandCurriculumCommandInput): Promise<IeltsBandCurriculumValidation> { return this.request('/admin/ielts-band-curriculum/validate', { method: 'POST', body: JSON.stringify(input) }, ieltsBandCurriculumValidationSchema); }
  publish(input: IeltsBandCurriculumCommandInput): Promise<PublishIeltsBandCurriculumResult> { return this.request('/admin/ielts-band-curriculum/publish', { method: 'POST', body: JSON.stringify(input) }, publishIeltsBandCurriculumResultSchema); }
  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try { const headers = new Headers(options.headers); if (options.body) headers.set('content-type', 'application/json'); response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include', headers }); }
    catch (cause) { throw new ApiError({ code: 'NETWORK_ERROR', message: cause instanceof Error ? cause.message : 'Network request failed', status: 0 }); }
    if (!response.ok) { const parsed = errorSchema.safeParse(await response.json().catch(() => null)); const message = parsed.success && parsed.data.message ? (Array.isArray(parsed.data.message) ? parsed.data.message.join('; ') : parsed.data.message) : `Request failed with status ${response.status}`; throw new ApiError({ code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR', message, status: response.status }); }
    return schema.parse(await response.json());
  }
}
export const adminIeltsBandClient = new AdminIeltsBandClient();
