export class InvalidTimezoneError extends Error {
  constructor(public readonly timezone: string) {
    super(`Invalid timezone identifier: ${timezone}`);
    this.name = 'InvalidTimezoneError';
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-CA', {
        day: '2-digit',
        month: '2-digit',
        timeZone: timezone,
        year: 'numeric',
      });
    } catch {
      throw new InvalidTimezoneError(timezone);
    }
    formatterCache.set(timezone, formatter);
  }
  return formatter;
}

export function toLocalDateKey(instant: Date, timezone: string): string {
  const formatter = getFormatter(timezone);
  return formatter.format(instant);
}

export function toWeekStartKey(dateKey: string): string {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay(); // 0 is Sunday, 1 is Monday, ...
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  utcDate.setUTCDate(utcDate.getUTCDate() - distanceToMonday);
  return utcDate.toISOString().slice(0, 10);
}

export interface ConsistencyWeekInput {
  readonly completedDays: number;
  readonly status?: 'ACTIVE' | 'MET' | 'MISSED';
  readonly targetDays: number;
  readonly weekStartKey: string;
}

export interface ConsistencyInput {
  readonly currentWeek: ConsistencyWeekInput;
  readonly pastWeeks: readonly ConsistencyWeekInput[];
}

export interface ConsistencyResult {
  readonly bestStreakWeeks: number;
  readonly currentStreakWeeks: number;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function parseDateUtc(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

export function calculateConsistency(input: ConsistencyInput): ConsistencyResult {
  const sortedPast = [...input.pastWeeks].sort(
    (a, b) => parseDateUtc(a.weekStartKey) - parseDateUtc(b.weekStartKey),
  );

  let streak = 0;
  let maxStreak = 0;

  for (let i = 0; i < sortedPast.length; i++) {
    const current = sortedPast[i]!;
    if (i > 0) {
      const prev = sortedPast[i - 1]!;
      const diffMs = parseDateUtc(current.weekStartKey) - parseDateUtc(prev.weekStartKey);
      if (diffMs !== MS_PER_WEEK) {
        // Gap of one or more weeks
        streak = 0;
      }
    }

    if (current.completedDays >= current.targetDays) {
      streak += 1;
      if (streak > maxStreak) {
        maxStreak = streak;
      }
    } else {
      streak = 0;
    }
  }

  // Connect last past week to current active week
  if (sortedPast.length > 0) {
    const lastPast = sortedPast[sortedPast.length - 1]!;
    const diffToCurrent = parseDateUtc(input.currentWeek.weekStartKey) - parseDateUtc(lastPast.weekStartKey);
    if (diffToCurrent !== MS_PER_WEEK) {
      streak = 0;
    }
  }

  // Active current week
  if (input.currentWeek.completedDays >= input.currentWeek.targetDays) {
    streak += 1;
    if (streak > maxStreak) {
      maxStreak = streak;
    }
  }
  // If current week not yet met, it does NOT break the streak before the week ends.

  return {
    bestStreakWeeks: maxStreak,
    currentStreakWeeks: streak,
  };
}
