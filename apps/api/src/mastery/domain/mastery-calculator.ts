import type { Clock } from './clock.port';
import type {
  MasteryCalculationInput,
  MasteryCalculationResult,
  MasteryState,
} from './mastery.types';

export class MasteryCalculator {
  constructor(private readonly clock: Clock) {}

  calculateNextState(input: MasteryCalculationInput): MasteryCalculationResult {
    const now = this.clock.now();
    const isSuccess = input.score >= 0.7 && input.eventType !== 'INCORRECT_ATTEMPT';
    const current = input.currentRecord;

    let state: MasteryState;
    let score: number;
    let confidence: number;
    let intervalDays: number;

    if (!current) {
      if (isSuccess) {
        state = 'LEARNING';
        score = Math.max(0.8, input.score);
        confidence = 0.5;
        intervalDays = 1.0;
      } else {
        state = 'NEEDS_ATTENTION';
        score = Math.min(0.3, Math.max(0.0, input.score));
        confidence = 0.2;
        intervalDays = 1.0;
      }
    } else {
      if (!isSuccess) {
        state = 'NEEDS_ATTENTION';
        score = Math.max(0.05, Math.min(current.score - 0.25, input.score));
        confidence = Math.max(0.1, current.confidence - 0.2);
        intervalDays = 1.0;
      } else {
        score = Math.min(1.0, current.score * 0.25 + input.score * 0.75);
        confidence = Math.min(1.0, current.confidence + 0.2);

        if (current.intervalDays < 2.0) {
          intervalDays = 3.0;
        } else if (current.intervalDays < 5.0) {
          intervalDays = 7.0;
        } else if (current.intervalDays < 10.0) {
          intervalDays = 14.0;
        } else {
          intervalDays = Math.min(60.0, current.intervalDays * 2);
        }

        if (intervalDays >= 7.0 && score >= 0.85) {
          state = 'STABLE';
        } else {
          state = 'LEARNING';
        }
      }
    }

    const nextReviewAt = new Date(
      now.getTime() + Math.round(intervalDays * 24 * 60 * 60 * 1000),
    );

    return {
      confidence: Number(confidence.toFixed(2)),
      intervalDays,
      nextReviewAt,
      score: Number(score.toFixed(2)),
      state,
    };
  }
}
