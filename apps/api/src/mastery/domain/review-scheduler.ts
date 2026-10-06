import type { Clock } from './clock.port';
import type {
  ReviewCandidate,
  ReviewSelectionOptions,
  ScheduledReviewItem,
} from './mastery.types';

export class ReviewScheduler {
  constructor(private readonly clock: Clock) {}

  selectReviewItems(
    candidates: ReviewCandidate[],
    options: ReviewSelectionOptions = {},
  ): ScheduledReviewItem[] {
    const now = this.clock.now();
    const nowTime = now.getTime();
    const skill = options.skill;
    const includeWeakUnscheduled = options.includeWeakUnscheduled ?? true;
    const limit = options.limit;

    const matched: ScheduledReviewItem[] = [];

    for (const item of candidates) {
      if (skill && item.skill !== skill) {
        continue;
      }

      const dueTime = item.nextReviewAt ? item.nextReviewAt.getTime() : null;
      const isDue = dueTime !== null && dueTime <= nowTime;
      const isNeedsAttention = item.state === 'NEEDS_ATTENTION';

      let eligible = false;
      let priorityReason: ScheduledReviewItem['priorityReason'] = 'UPCOMING';
      let priorityScore = 0;

      if (isNeedsAttention) {
        if (isDue || includeWeakUnscheduled) {
          eligible = true;
          priorityReason = 'NEEDS_ATTENTION';
          // Highest priority bracket: 1000 base + penalty for low score + overdue component
          const overdueHours = dueTime ? Math.max(0, (nowTime - dueTime) / 3600000) : 0;
          priorityScore = 1000 + (1 - item.score) * 100 + overdueHours;
        }
      } else if (isDue) {
        eligible = true;
        const overdueHours = dueTime ? Math.max(0, (nowTime - dueTime) / 3600000) : 0;
        priorityReason = overdueHours > 1 ? 'OVERDUE' : 'DUE';
        priorityScore = 500 + overdueHours * 2 + (1 - item.score) * 50;
      }

      if (eligible) {
        matched.push({
          ...item,
          priorityReason,
          priorityScore,
        });
      }
    }

    const tier = (reason: ScheduledReviewItem['priorityReason']) =>
      reason === 'NEEDS_ATTENTION' ? 2 : reason === 'OVERDUE' ? 1 : 0;
    matched.sort((a, b) =>
      tier(b.priorityReason) - tier(a.priorityReason) ||
      b.priorityScore - a.priorityScore ||
      a.id.localeCompare(b.id),
    );

    if (limit && limit > 0) {
      return matched.slice(0, limit);
    }

    return matched;
  }
}
