import type { ActivityType, MasteryEventType, MasteryState } from '@prisma/client';

export type { ActivityType, MasteryEventType, MasteryState };

export interface MasteryRecordInput {
  score: number;
  confidence: number;
  intervalDays: number;
  state: MasteryState;
}

export interface MasteryCalculationInput {
  currentRecord: MasteryRecordInput | null;
  score: number;
  eventType: MasteryEventType;
}

export interface MasteryCalculationResult {
  state: MasteryState;
  score: number;
  confidence: number;
  intervalDays: number;
  nextReviewAt: Date;
}

export interface ReviewCandidate {
  id: string;
  languageBlockId: string;
  skill: ActivityType;
  state: MasteryState;
  score: number;
  confidence: number;
  nextReviewAt: Date | null;
}

export interface ScheduledReviewItem extends ReviewCandidate {
  priorityReason: 'NEEDS_ATTENTION' | 'OVERDUE' | 'DUE' | 'UPCOMING';
  priorityScore: number;
}

export interface ReviewSelectionOptions {
  skill?: ActivityType;
  limit?: number;
  includeWeakUnscheduled?: boolean;
}
