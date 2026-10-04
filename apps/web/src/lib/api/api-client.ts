import {
  authUserSchema,
  sessionPlanSchema,
  type AuthUser,
} from '@worklingo/contracts';
import { z } from 'zod';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: readonly unknown[];
  readonly requestId: string | null;

  constructor(options: {
    message: string;
    code: string;
    status: number;
    details?: readonly unknown[];
    requestId?: string | null;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details ?? [];
    this.requestId = options.requestId ?? null;
  }
}

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    details: z.array(z.unknown()).optional(),
    requestId: z.string().optional(),
  }).optional(),
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
});

export const activityAttemptDtoSchema = z.object({
  id: z.string(),
  learnerId: z.string(),
  sessionId: z.string(),
  activityId: z.string(),
  clientAttemptId: z.string(),
  evaluationStatus: z.enum(['submitted', 'evaluated']),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  createdAt: z.string(),
  rawResponse: z.unknown(),
  normalizedResponse: z.unknown().nullable(),
});

export const learnerActivityDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  activityType: z.enum(['reading', 'listening', 'speaking', 'writing']),
  learningBlock: z.enum(['activate', 'readDecode', 'listenReason', 'respond']),
  skills: z.array(z.enum(['reading', 'listening', 'speaking', 'writing'])),
  content: z.array(z.record(z.string(), z.unknown())),
  languageBlocks: z.array(z.record(z.string(), z.unknown())),
  payload: z.record(z.string(), z.unknown()),
});

export const sessionBlockDtoSchema = z.object({
  id: z.string(),
  type: z.enum(['activate', 'readDecode', 'listenReason', 'respond']),
  order: z.number(),
  targetMinutes: z.literal(15),
  activityIds: z.array(z.string()),
  status: z.enum(['available', 'completed']),
});

export const learningSessionDtoSchema = z.object({
  id: z.string(),
  clientSessionId: z.string(),
  lessonVersionId: z.string(),
  durationMinutes: z.literal(60),
  status: z.enum(['planned', 'in_progress', 'paused', 'completed', 'abandoned']),
  currentCheckpoint: z.number(),
  mission: z.object({
    id: z.string(),
    title: z.string(),
  }),
  plan: sessionPlanSchema,
  blocks: z.array(sessionBlockDtoSchema),
  attempts: z.array(activityAttemptDtoSchema),
});

export const learnerProgressDtoSchema = z.object({
  activityAttempts: z.number(),
  completedActivities: z.number(),
  currentLevelCode: z.string().nullable(),
  sessions: z.object({
    completed: z.number(),
    inProgress: z.number(),
    paused: z.number(),
    planned: z.number(),
  }),
});

export type ActivityAttemptDto = z.infer<typeof activityAttemptDtoSchema>;
export type LearnerActivityDto = z.infer<typeof learnerActivityDtoSchema>;
export type LearningSessionDto = z.infer<typeof learningSessionDtoSchema>;
export type LearnerProgressDto = z.infer<typeof learnerProgressDtoSchema>;

export interface SubmitAttemptInput {
  readonly clientAttemptId: string;
  readonly sessionId: string;
  readonly response: Record<string, unknown>;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!headers['content-type'] && options.body && typeof options.body === 'string') {
      headers['content-type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });
    } catch (networkError) {
      throw new ApiError({
        message: networkError instanceof Error ? networkError.message : 'Network request failed',
        code: 'NETWORK_ERROR',
        status: 0,
      });
    }

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = null;
      }

      const parsedError = errorEnvelopeSchema.safeParse(errorBody);
      let code = 'API_ERROR';
      let message = `Request failed with status ${response.status}`;
      let details: unknown[] = [];
      let requestId: string | null = null;

      if (parsedError.success && parsedError.data) {
        const data = parsedError.data;
        if (data.error) {
          code = data.error.code ?? code;
          message = data.error.message ?? message;
          details = (data.error.details as unknown[]) ?? [];
          requestId = data.error.requestId ?? null;
        } else {
          code = data.code ?? code;
          if (Array.isArray(data.message)) {
            message = data.message.join('; ');
          } else if (data.message) {
            message = data.message;
          }
        }
      }

      throw new ApiError({
        message,
        code,
        status: response.status,
        details,
        requestId,
      });
    }

    const json = await response.json();
    return schema.parse(json);
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.request('/me', { method: 'GET' }, authUserSchema);
  }

  async createSession(clientSessionId: string, durationMinutes = 60): Promise<LearningSessionDto> {
    return this.request(
      '/learning-sessions',
      {
        method: 'POST',
        body: JSON.stringify({ clientSessionId, durationMinutes }),
      },
      learningSessionDtoSchema,
    );
  }

  async getSession(id: string): Promise<LearningSessionDto> {
    return this.request(`/learning-sessions/${id}`, { method: 'GET' }, learningSessionDtoSchema);
  }

  async getActivity(sessionId: string, activityId: string): Promise<LearnerActivityDto> {
    return this.request(
      `/learning-sessions/${sessionId}/activities/${activityId}`,
      { method: 'GET' },
      learnerActivityDtoSchema,
    );
  }

  async startSession(id: string): Promise<LearningSessionDto> {
    return this.request(`/learning-sessions/${id}/start`, { method: 'POST' }, learningSessionDtoSchema);
  }

  async pauseSession(id: string): Promise<LearningSessionDto> {
    return this.request(`/learning-sessions/${id}/pause`, { method: 'POST' }, learningSessionDtoSchema);
  }

  async resumeSession(id: string): Promise<LearningSessionDto> {
    return this.request(`/learning-sessions/${id}/resume`, { method: 'POST' }, learningSessionDtoSchema);
  }

  async submitAttempt(activityId: string, input: SubmitAttemptInput): Promise<ActivityAttemptDto> {
    return this.request(
      `/activities/${activityId}/attempts`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      activityAttemptDtoSchema,
    );
  }

  async getProgress(): Promise<LearnerProgressDto> {
    return this.request('/me/progress', { method: 'GET' }, learnerProgressDtoSchema);
  }
}

export const apiClient = new ApiClient();
