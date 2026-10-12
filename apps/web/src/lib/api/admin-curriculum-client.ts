import {
  adminCurriculumTreeSchema,
  adminLearningPathItemSchema,
  adminLevelItemSchema,
  adminMissionItemSchema,
  type AdminCurriculumTreeDto,
  type AdminLearningPathItemDto,
  type AdminLevelItemDto,
  type AdminMissionItemDto,
  type ArchiveLearningPathInput,
  type ArchiveLevelInput,
  type ArchiveMissionInput,
  type CreateLearningPathInput,
  type CreateLevelInput,
  type CreateMissionInput,
  type PublishLearningPathInput,
  type PublishLevelInput,
  type PublishMissionInput,
  type ReorderCurriculumInput,
  type ReplaceMissionLessonsInput,
  type UpdateLearningPathInput,
  type UpdateLevelInput,
  type UpdateMissionInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
});

export class AdminCurriculumClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(
      /\/+$/u,
      '',
    );
  }

  async getTree(): Promise<AdminCurriculumTreeDto> {
    return this.request('/admin/curriculum', { method: 'GET' }, adminCurriculumTreeSchema);
  }

  // Paths
  async createPath(input: CreateLearningPathInput): Promise<AdminLearningPathItemDto> {
    return this.request(
      '/admin/curriculum/paths',
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLearningPathItemSchema,
    );
  }

  async updatePath(
    pathId: string,
    input: UpdateLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    return this.request(
      `/admin/curriculum/paths/${pathId}`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PATCH',
      },
      adminLearningPathItemSchema,
    );
  }

  async publishPath(
    pathId: string,
    input: PublishLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    return this.request(
      `/admin/curriculum/paths/${pathId}/publish`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLearningPathItemSchema,
    );
  }

  async archivePath(
    pathId: string,
    input: ArchiveLearningPathInput,
  ): Promise<AdminLearningPathItemDto> {
    return this.request(
      `/admin/curriculum/paths/${pathId}/archive`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLearningPathItemSchema,
    );
  }

  async reorderLevels(
    pathId: string,
    input: ReorderCurriculumInput,
  ): Promise<AdminLevelItemDto[]> {
    return this.request(
      `/admin/curriculum/paths/${pathId}/level-order`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PUT',
      },
      z.array(adminLevelItemSchema),
    );
  }

  // Levels
  async createLevel(input: CreateLevelInput): Promise<AdminLevelItemDto> {
    return this.request(
      '/admin/curriculum/levels',
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLevelItemSchema,
    );
  }

  async updateLevel(
    levelId: string,
    input: UpdateLevelInput,
  ): Promise<AdminLevelItemDto> {
    return this.request(
      `/admin/curriculum/levels/${levelId}`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PATCH',
      },
      adminLevelItemSchema,
    );
  }

  async publishLevel(
    levelId: string,
    input: PublishLevelInput,
  ): Promise<AdminLevelItemDto> {
    return this.request(
      `/admin/curriculum/levels/${levelId}/publish`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLevelItemSchema,
    );
  }

  async archiveLevel(
    levelId: string,
    input: ArchiveLevelInput,
  ): Promise<AdminLevelItemDto> {
    return this.request(
      `/admin/curriculum/levels/${levelId}/archive`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminLevelItemSchema,
    );
  }

  async reorderMissions(
    levelId: string,
    input: ReorderCurriculumInput,
  ): Promise<AdminMissionItemDto[]> {
    return this.request(
      `/admin/curriculum/levels/${levelId}/mission-order`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PUT',
      },
      z.array(adminMissionItemSchema),
    );
  }

  // Missions
  async createMission(input: CreateMissionInput): Promise<AdminMissionItemDto> {
    return this.request(
      '/admin/curriculum/missions',
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminMissionItemSchema,
    );
  }

  async updateMission(
    missionId: string,
    input: UpdateMissionInput,
  ): Promise<AdminMissionItemDto> {
    return this.request(
      `/admin/curriculum/missions/${missionId}`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PATCH',
      },
      adminMissionItemSchema,
    );
  }

  async publishMission(
    missionId: string,
    input: PublishMissionInput,
  ): Promise<AdminMissionItemDto> {
    return this.request(
      `/admin/curriculum/missions/${missionId}/publish`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminMissionItemSchema,
    );
  }

  async archiveMission(
    missionId: string,
    input: ArchiveMissionInput,
  ): Promise<AdminMissionItemDto> {
    return this.request(
      `/admin/curriculum/missions/${missionId}/archive`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'POST',
      },
      adminMissionItemSchema,
    );
  }

  async replaceMissionLessons(
    missionId: string,
    input: ReplaceMissionLessonsInput,
  ): Promise<AdminMissionItemDto> {
    return this.request(
      `/admin/curriculum/missions/${missionId}/lessons`,
      {
        body: JSON.stringify(input),
        headers: { 'x-idempotency-key': input.idempotencyKey },
        method: 'PUT',
      },
      adminMissionItemSchema,
    );
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
      };
      if (options.body && typeof options.body === 'string') {
        headers['content-type'] = 'application/json';
      }

      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        headers,
      });
    } catch (error) {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      });
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as unknown;
      const parsed = errorSchema.safeParse(payload);
      const message =
        parsed.success && parsed.data.message
          ? Array.isArray(parsed.data.message)
            ? parsed.data.message.join('; ')
            : parsed.data.message
          : `Request failed with status ${response.status}`;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message,
        status: response.status,
      });
    }

    return schema.parse(await response.json());
  }
}

export const adminCurriculumClient = new AdminCurriculumClient();
