import type { ActivityType, MasteryRecord } from '@prisma/client';

export interface SkillMemoryHealth {
  health: number | null;
  evaluatedBlocksCount: number;
  dueCount: number;
  needsAttentionCount: number;
}

export interface MemoryHealthSummary {
  reading: SkillMemoryHealth;
  listening: SkillMemoryHealth;
  speaking: SkillMemoryHealth;
  writing: SkillMemoryHealth;
  overall: SkillMemoryHealth;
}

export function calculateRecordHealth(record: MasteryRecord, now: Date): number {
  const base = Math.round(100 * (0.7 * record.score + 0.3 * record.confidence));

  let overdueDays = 0;
  if (record.nextReviewAt) {
    const overdueMs = now.getTime() - record.nextReviewAt.getTime();
    if (overdueMs > 0) {
      overdueDays = Math.floor(overdueMs / 86400000);
    }
  }

  const penalty = Math.min(40, overdueDays * 5);
  let health = Math.min(100, Math.max(0, base - penalty));

  if (record.state === 'NEEDS_ATTENTION') {
    health = Math.min(40, health);
  }

  return health;
}

export function summarizeMemoryHealth(
  records: MasteryRecord[],
  now: Date,
): MemoryHealthSummary {
  const evaluatedRecords = records.filter((record) => record.lastEvidenceAt !== null);
  const recordsBySkill: Record<ActivityType, MasteryRecord[]> = {
    reading: [],
    listening: [],
    speaking: [],
    writing: [],
  };

  for (const record of evaluatedRecords) {
    if (recordsBySkill[record.skill]) {
      recordsBySkill[record.skill].push(record);
    }
  }

  const calculateSkillSummary = (skillRecords: MasteryRecord[]): SkillMemoryHealth => {
    if (skillRecords.length === 0) {
      return {
        health: null,
        evaluatedBlocksCount: 0,
        dueCount: 0,
        needsAttentionCount: 0,
      };
    }

    let totalHealth = 0;
    let dueCount = 0;
    let needsAttentionCount = 0;

    for (const rec of skillRecords) {
      const h = calculateRecordHealth(rec, now);
      totalHealth += h;
      if (rec.nextReviewAt && rec.nextReviewAt.getTime() <= now.getTime()) {
        dueCount++;
      }
      if (rec.state === 'NEEDS_ATTENTION') {
        needsAttentionCount++;
      }
    }

    return {
      health: Math.round(totalHealth / skillRecords.length),
      evaluatedBlocksCount: skillRecords.length,
      dueCount,
      needsAttentionCount,
    };
  };

  const reading = calculateSkillSummary(recordsBySkill.reading);
  const listening = calculateSkillSummary(recordsBySkill.listening);
  const speaking = calculateSkillSummary(recordsBySkill.speaking);
  const writing = calculateSkillSummary(recordsBySkill.writing);

  let overall: SkillMemoryHealth;
  if (evaluatedRecords.length === 0) {
    overall = {
      health: null,
      evaluatedBlocksCount: 0,
      dueCount: 0,
      needsAttentionCount: 0,
    };
  } else {
    let totalHealth = 0;
    let dueCount = 0;
    let needsAttentionCount = 0;

    for (const rec of evaluatedRecords) {
      const h = calculateRecordHealth(rec, now);
      totalHealth += h;
      if (rec.nextReviewAt && rec.nextReviewAt.getTime() <= now.getTime()) {
        dueCount++;
      }
      if (rec.state === 'NEEDS_ATTENTION') {
        needsAttentionCount++;
      }
    }

    overall = {
      health: Math.round(totalHealth / evaluatedRecords.length),
      evaluatedBlocksCount: evaluatedRecords.length,
      dueCount,
      needsAttentionCount,
    };
  }

  return {
    reading,
    listening,
    speaking,
    writing,
    overall,
  };
}
