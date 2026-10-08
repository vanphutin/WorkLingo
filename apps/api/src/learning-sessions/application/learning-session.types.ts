import type { SessionAvailabilityDto, SessionDuration, SessionPlan } from '@worklingo/contracts';

export type { SessionAvailabilityDto };

export interface ActivityAttemptDto {
  readonly id: string;
  readonly learnerId: string;
  readonly sessionId: string;
  readonly activityId: string;
  readonly clientAttemptId: string;
  readonly evaluationStatus: 'submitted' | 'queued' | 'processing' | 'evaluated' | 'evaluation_failed';
  readonly score: number | null;
  readonly feedback: string | null;
  readonly createdAt: string;
  readonly rawResponse: unknown;
  readonly normalizedResponse: unknown | null;
}

export interface LearnerActivityDto {
  readonly id: string;
  readonly slug: string;
  readonly activityType: 'reading' | 'listening' | 'speaking' | 'writing';
  readonly learningBlock: 'activate' | 'readDecode' | 'listenReason' | 'respond';
  readonly skills: ReadonlyArray<'reading' | 'listening' | 'speaking' | 'writing'>;
  readonly content: ReadonlyArray<Record<string, unknown>>;
  readonly languageBlocks: ReadonlyArray<Record<string, unknown>>;
  readonly payload: Record<string, unknown>;
}

export interface LearningSessionDto {
  readonly id: string;
  readonly clientSessionId: string;
  readonly lessonVersionId: string;
  readonly durationMinutes: SessionDuration;
  readonly status: 'planned' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  readonly currentCheckpoint: number;
  readonly mission: { readonly id: string; readonly title: string };
  readonly plan: SessionPlan;
  readonly blocks: ReadonlyArray<{
    readonly id: string;
    readonly type: 'activate' | 'readDecode' | 'listenReason' | 'respond';
    readonly order: number;
    readonly targetMinutes: 15;
    readonly activityIds: readonly string[];
    readonly status: 'available' | 'completed';
  }>;
  readonly attempts: readonly ActivityAttemptDto[];
}

export interface SubmitAttemptInput {
  readonly clientAttemptId: string;
  readonly sessionId: string;
  readonly response: Record<string, unknown>;
}
