import {
  audioArtifactDtoSchema,
  authUserSchema,
  contentImportSchema,
  contentIssueSchema,
  contentStatusSchema,
  createCheckpointAssessmentSchema,
  generateAudioResultSchema,
  evaluationDtoSchema,
  jobDtoSchema,
  publishContentImportResultSchema,
  recordingSubmissionResultSchema,
  sessionAvailabilitySchema,
  sessionDurationSchema,
  sessionPlanSchema,
  writingDraftSchema,
  validateContentImportResultSchema,
  type AudioArtifactDto,
  type AuthUser,
  type ContentImportDto,
  type ContentPreviewDto,
  type CreateCheckpointAssessment,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type EvaluationDto,
  type JobDto,
  type PublishContentImportInput,
  type PublishContentImportResult,
  type RecordingSubmissionResult,
  type SessionAvailabilityDto,
  type WritingDraft,
  type UpdateContentSourceInput,
  type ValidateContentImportInput,
  type ValidateContentImportResult,
} from '@worklingo/contracts';
import { z } from 'zod';
import {
  checkpointAssessmentSchema, progressionSummarySchema,
  errorBankSchema, masteryMapSchema, memoryHealthSchema,
  type CheckpointAssessmentDto, type ProgressionSummaryDto,
  type ErrorBankDto, type ErrorBankQuery, type MasteryMapDto, type MemoryHealthDto,
} from './learner-schemas';
export type { CheckpointAssessmentDto, ProgressionSummaryDto, ErrorBankDto, ErrorBankQuery, LearningSkill, MasteryMapDto, MemoryHealthDto } from './learner-schemas';
export type { RecordingSubmissionResult, SessionAvailabilityDto } from '@worklingo/contracts';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: readonly unknown[];
  readonly requestId: string | null;
  readonly availableDurations: readonly number[] | undefined;

  constructor(options: {
    message: string;
    code: string;
    status: number;
    details?: readonly unknown[];
    requestId?: string | null;
    availableDurations?: readonly number[] | undefined;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details ?? [];
    this.requestId = options.requestId ?? null;
    this.availableDurations = options.availableDurations;
  }
}

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    details: z.array(z.unknown()).optional(),
    requestId: z.string().optional(),
    availableDurations: z.array(z.number()).optional(),
  }).optional(),
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
  availableDurations: z.array(z.number()).optional(),
});

export const activityAttemptDtoSchema = z.object({
  id: z.string(),
  learnerId: z.string(),
  sessionId: z.string(),
  activityId: z.string(),
  clientAttemptId: z.string(),
  evaluationStatus: z.enum(['submitted', 'queued', 'processing', 'evaluated', 'evaluation_failed']),
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
  durationMinutes: sessionDurationSchema,
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

export interface SubmitRecordingInput {
  readonly activityId: string;
  readonly audio: Blob;
  readonly clientAttemptId: string;
  readonly consentAccepted: true;
  readonly consentPolicyVersion: string;
  readonly consentScope: string;
  readonly sessionId: string;
}

export const contentPreviewDtoSchema = z.object({
  importId: z.string().uuid(),
  draftRevision: z.number().int().positive(),
  sourceHash: z.string(),
  status: contentStatusSchema,
  normalizedDraft: z.unknown().nullable(),
  issues: z.array(contentIssueSchema),
  canPublish: z.boolean(),
});

export const archiveLessonVersionResultSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('ARCHIVED'),
});
export type ArchiveLessonVersionResult = z.infer<typeof archiveLessonVersionResultSchema>;

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
      let availableDurations: readonly number[] | undefined;

      if (parsedError.success && parsedError.data) {
        const data = parsedError.data;
        availableDurations = data.availableDurations ?? data.error?.availableDurations;
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
        availableDurations,
      });
    }

    if (response.status === 204) return schema.parse(undefined);
    const json = await response.json();
    return schema.parse(json);
  }

  async getCurrentUser(): Promise<AuthUser> {
    return this.request('/me', { method: 'GET' }, authUserSchema);
  }

  async getSessionAvailability(): Promise<SessionAvailabilityDto> {
    return this.request(
      '/learning-sessions/availability',
      { method: 'GET' },
      sessionAvailabilitySchema,
    );
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

  async submitRecording(input: SubmitRecordingInput): Promise<RecordingSubmissionResult> {
    const form = new FormData();
    const mimeType = input.audio.type || 'audio/webm';
    const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : 'webm';
    form.append('audio', input.audio, `recording.${extension}`);
    form.append('sessionId', z.uuid().parse(input.sessionId));
    form.append('clientAttemptId', z.uuid().parse(input.clientAttemptId));
    form.append('consentAccepted', String(input.consentAccepted));
    form.append('consentPolicyVersion', input.consentPolicyVersion);
    form.append('consentScope', input.consentScope);
    return this.request(
      `/activities/${z.uuid().parse(input.activityId)}/recordings`,
      { method: 'POST', body: form },
      recordingSubmissionResultSchema,
    );
  }

  async deleteRecording(recordingId: string): Promise<void> {
    await this.request(
      `/recordings/${z.uuid().parse(recordingId)}`,
      { method: 'DELETE' },
      z.undefined(),
    );
  }

  async getEvaluation(attemptId: string): Promise<EvaluationDto> {
    return this.request(
      `/attempts/${z.uuid().parse(attemptId)}/evaluation`,
      { method: 'GET' },
      evaluationDtoSchema,
    );
  }

  async retryEvaluation(attemptId: string): Promise<EvaluationDto> {
    return this.request(
      `/attempts/${z.uuid().parse(attemptId)}/evaluation/retry`,
      { method: 'POST' },
      evaluationDtoSchema,
    );
  }

  async getActivityDraft(sessionId: string, activityId: string): Promise<WritingDraft | null> {
    return this.request(
      `/learning-sessions/${z.uuid().parse(sessionId)}/activities/${z.uuid().parse(activityId)}/draft`,
      { method: 'GET' },
      writingDraftSchema.nullable(),
    );
  }

  async saveActivityDraft(
    sessionId: string,
    activityId: string,
    input: { readonly expectedRevision: number; readonly text: string },
  ): Promise<WritingDraft> {
    return this.request(
      `/learning-sessions/${z.uuid().parse(sessionId)}/activities/${z.uuid().parse(activityId)}/draft`,
      { method: 'PUT', body: JSON.stringify(input) },
      writingDraftSchema,
    );
  }

  getActivityAudioUrl(sessionId: string, activityId: string): string {
    return `${this.baseUrl}/learning-sessions/${z.uuid().parse(sessionId)}/activities/${z.uuid().parse(activityId)}/audio`;
  }

  async getProgress(): Promise<LearnerProgressDto> {
    return this.request('/me/progress', { method: 'GET' }, learnerProgressDtoSchema);
  }

  async getMasteryMap(): Promise<MasteryMapDto> {
    return this.request('/me/mastery-map', { method: 'GET' }, masteryMapSchema);
  }

  async getProgression(): Promise<ProgressionSummaryDto> {
    return this.request('/me/progression', { method: 'GET' }, progressionSummarySchema);
  }

  async assessCheckpoint(input: CreateCheckpointAssessment): Promise<CheckpointAssessmentDto> {
    return this.request('/me/checkpoint-assessments', {
      method: 'POST', body: JSON.stringify(createCheckpointAssessmentSchema.parse(input)),
    }, checkpointAssessmentSchema);
  }

  async confirmCheckpoint(id: string): Promise<ProgressionSummaryDto> {
    return this.request(`/me/checkpoint-assessments/${z.uuid().parse(id)}/confirm`, {
      method: 'POST',
    }, progressionSummarySchema);
  }

  async getMemoryHealth(): Promise<MemoryHealthDto> {
    return this.request('/me/memory-health', { method: 'GET' }, memoryHealthSchema);
  }

  async getErrorBank(query: ErrorBankQuery = {}): Promise<ErrorBankDto> {
    const params = new URLSearchParams();
    if (query.skill) params.set('skill', query.skill);
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 20));
    return this.request(`/me/error-bank?${params}`, { method: 'GET' }, errorBankSchema);
  }

  async listContentImports(): Promise<ContentImportDto[]> {
    return this.request('/admin/content-imports', { method: 'GET' }, z.array(contentImportSchema));
  }

  async createContentImport(rawSource: string): Promise<ContentImportDto> {
    return this.request(
      '/admin/content-imports',
      {
        method: 'POST',
        body: JSON.stringify({ rawSource }),
      },
      contentImportSchema,
    );
  }

  async getContentImport(id: string): Promise<ContentImportDto> {
    return this.request(`/admin/content-imports/${id}`, { method: 'GET' }, contentImportSchema);
  }

  async updateContentSource(id: string, input: UpdateContentSourceInput): Promise<ContentImportDto> {
    return this.request(
      `/admin/content-imports/${id}/source`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      contentImportSchema,
    );
  }

  async validateContentImport(
    id: string,
    input: ValidateContentImportInput,
  ): Promise<ValidateContentImportResult> {
    return this.request(
      `/admin/content-imports/${id}/validate`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      validateContentImportResultSchema,
    );
  }

  async getContentPreview(id: string): Promise<ContentPreviewDto> {
    return this.request(
      `/admin/content-imports/${id}/preview`,
      { method: 'GET' },
      contentPreviewDtoSchema as unknown as z.ZodType<ContentPreviewDto>,
    );
  }

  async generateAudio(id: string, input: GenerateAudioInput): Promise<GenerateAudioResult> {
    return this.request(
      `/admin/content-imports/${id}/generate-audio`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      generateAudioResultSchema,
    );
  }

  async listContentAudioArtifacts(importId: string): Promise<AudioArtifactDto[]> {
    return this.request(
      `/admin/content-imports/${importId}/audio`,
      { method: 'GET' },
      z.array(audioArtifactDtoSchema),
    );
  }

  getAudioArtifactContentUrl(id: string): string {
    return `${this.baseUrl}/admin/audio-artifacts/${id}/content`;
  }

  async getJob(id: string): Promise<JobDto> {
    return this.request(`/jobs/${id}`, { method: 'GET' }, jobDtoSchema);
  }

  async publishContentImport(
    id: string,
    input: PublishContentImportInput,
  ): Promise<PublishContentImportResult> {
    return this.request(
      `/admin/content-imports/${id}/publish`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      publishContentImportResultSchema,
    );
  }

  async archiveLessonVersion(id: string): Promise<ArchiveLessonVersionResult> {
    return this.request(
      `/admin/lesson-versions/${id}/archive`,
      { method: 'POST' },
      archiveLessonVersionResultSchema,
    );
  }
}

export const apiClient = new ApiClient();
