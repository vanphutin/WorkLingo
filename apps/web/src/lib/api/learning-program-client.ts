import {
  learningProgramCatalogSchema,
  createProgramSchema, updateProgramSchema, publishProgramSchema, enrollProgramSchema, adminProgramSchema, adminProgramListSchema,
  type CreateProgramInput, type UpdateProgramInput, type PublishProgramInput, type EnrollProgramInput,
  activateProgramSchema,
  programContextSchema,
  type ActivateProgramInput,
  type LearningProgramCatalogDto,
  type ProgramContextDto,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
});

export class LearningProgramClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(
      /\/+$/u,
      '',
    );
  }

  async getCatalog(): Promise<LearningProgramCatalogDto> {
    return learningProgramCatalogSchema.parse(await (await this.request('/learning-programs', 'GET')).json());
  }

  async getContext(): Promise<ProgramContextDto> {
    return programContextSchema.parse(await (await this.request('/me/program-context', 'GET')).json());
  }

  async activateProgram(input: ActivateProgramInput): Promise<ProgramContextDto> {
    const body = activateProgramSchema.parse(input);
    return programContextSchema.parse(await (await this.request('/me/program-context', 'PUT', body)).json());
  }

  async listPrograms() { return adminProgramListSchema.parse(await (await this.request('/admin/learning-programs', 'GET')).json()); }
  async createProgram(input: CreateProgramInput) { return adminProgramSchema.parse(await (await this.request('/admin/learning-programs', 'POST', createProgramSchema.parse(input))).json()); }
  async updateProgram(id: string, input: UpdateProgramInput) { return adminProgramSchema.parse(await (await this.request(`/admin/learning-programs/${z.uuid().parse(id)}`, 'PUT', updateProgramSchema.parse(input))).json()); }
  async publishProgram(id: string, input: PublishProgramInput) { return adminProgramSchema.parse(await (await this.request(`/admin/learning-programs/${z.uuid().parse(id)}/publish`, 'POST', publishProgramSchema.parse(input))).json()); }
  async enrollProgram(input: EnrollProgramInput): Promise<ProgramContextDto> { return programContextSchema.parse(await (await this.request('/me/program-enrollments', 'POST', enrollProgramSchema.parse(input))).json()); }

  private async request(path: string, method: 'GET' | 'PUT' | 'POST', body?: object): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        credentials: 'include',
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the learning program catalog.',
        status: 0,
      });
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const parsed = errorSchema.safeParse(payload);
      const rawMessage = parsed.success ? parsed.data.message : undefined;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message: Array.isArray(rawMessage)
          ? rawMessage.join('; ')
          : rawMessage ?? 'Unable to load learning programs.',
        status: response.status,
      });
    }

    return response;
  }
}

export const learningProgramClient = new LearningProgramClient();
