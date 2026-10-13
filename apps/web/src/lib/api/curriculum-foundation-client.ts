import {
  curriculumDraftSchema,
  curriculumRevisionSchema,
  type CurriculumDraftDto,
  type CurriculumRevisionDto,
  type FoundationCommand,
  type SaveFoundationDraftInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

export class CurriculumFoundationClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  getDraft(missionId: string): Promise<CurriculumDraftDto> {
    return this.request(`/admin/curriculum/missions/${missionId}/foundation`, { method: 'GET' }, curriculumDraftSchema);
  }

  saveDraft(missionId: string, input: SaveFoundationDraftInput): Promise<CurriculumDraftDto> {
    return this.request(`/admin/curriculum/missions/${missionId}/foundation`, this.command('PUT', input), curriculumDraftSchema);
  }

  validateDraft(missionId: string, input: FoundationCommand): Promise<CurriculumDraftDto> {
    return this.request(`/admin/curriculum/missions/${missionId}/foundation/validate`, this.command('POST', input), curriculumDraftSchema);
  }

  publishDraft(missionId: string, input: FoundationCommand): Promise<CurriculumRevisionDto> {
    return this.request(`/admin/curriculum/missions/${missionId}/foundation/publish`, this.command('POST', input), curriculumRevisionSchema);
  }

  archiveRevision(revisionId: string, input: FoundationCommand): Promise<CurriculumRevisionDto> {
    return this.request(`/admin/curriculum/foundation-revisions/${revisionId}/archive`, this.command('POST', input), curriculumRevisionSchema);
  }

  private command(method: 'POST' | 'PUT', input: FoundationCommand | SaveFoundationDraftInput): RequestInit {
    return { body: JSON.stringify(input), headers: { 'content-type': 'application/json', 'x-idempotency-key': input.idempotencyKey }, method };
  }

  private async request<T>(path: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...options, credentials: 'include' });
    } catch (error) {
      throw new ApiError({ code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network request failed', status: 0 });
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(await response.json().catch(() => null));
      const value = parsed.success ? parsed.data.message : undefined;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message: Array.isArray(value) ? value.join('; ') : value ?? `Request failed with status ${response.status}`,
        status: response.status,
      });
    }
    return schema.parse(await response.json());
  }
}

export const curriculumFoundationClient = new CurriculumFoundationClient();
