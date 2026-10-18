import { Inject, Injectable } from '@nestjs/common';
import { ieltsStudyProgressSchema, type IeltsStudyProgressDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { MasteryService } from '../../mastery/application/mastery.service.js';

interface ProgressEvidence {
  completedSessionCount: number;
  dueReviewCount: number;
  attempts: { evaluationStatus: string; score: number | null; activity: { skills: string[]; languageBlockReferences: string[] } }[];
  records: { languageBlockId: string; skill: string; state: string; lastEvidenceAt: Date | null }[];
}
export function summarizeIeltsStudyProgress(input: ProgressEvidence): IeltsStudyProgressDto {
  const skills = ['reading', 'listening', 'speaking', 'writing'] as const;
  const pending = (status: string) => ['SUBMITTED', 'QUEUED', 'PROCESSING'].includes(status);
  const stable = new Map<string, Set<string>>();
  for (const record of input.records) if (record.state === 'STABLE' && record.lastEvidenceAt) {
    const recorded = stable.get(record.languageBlockId) ?? new Set<string>(); recorded.add(record.skill); stable.set(record.languageBlockId, recorded);
  }
  return ieltsStudyProgressSchema.parse({ completedSessionCount: input.completedSessionCount, practicedChunkCount: new Set(input.attempts.flatMap(attempt => attempt.activity.languageBlockReferences)).size,
    masteredChunkCount: [...stable.values()].filter(recorded => skills.every(skill => recorded.has(skill))).length,
    pendingEvaluationCount: input.attempts.filter(attempt => pending(attempt.evaluationStatus)).length, dueReviewCount: input.dueReviewCount,
    skills: skills.map(skill => {
      const evaluated = input.attempts.filter(attempt => attempt.activity.skills.includes(skill) && attempt.evaluationStatus === 'EVALUATED' && attempt.score !== null);
      return { skill, evaluatedCount: evaluated.length, pendingCount: input.attempts.filter(attempt => attempt.activity.skills.includes(skill) && pending(attempt.evaluationStatus)).length, score: evaluated.length ? evaluated.reduce((sum, attempt) => sum + attempt.score!, 0) / evaluated.length : null };
    }),
  });
}

@Injectable()
export class IeltsStudyProgressService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(MasteryService) private readonly mastery: MasteryService) {}
  async progress(learnerId: string): Promise<IeltsStudyProgressDto> {
    const program = await this.db.learningProgram.findUniqueOrThrow({ where: { slug: 'ielts' } });
    const [completedSessionCount, attempts, records, queue] = await Promise.all([
      this.db.ieltsTopicSession.count({ where: { session: { learnerId, status: 'COMPLETED' } } }),
      this.db.activityAttempt.findMany({ where: { learnerId, session: { ieltsTopicSession: { isNot: null } } }, select: { evaluationStatus: true, score: true, activity: { select: { skills: true, languageBlockReferences: true } } } }),
      this.mastery.getMasteryRecords(learnerId, undefined, { programId: program.id }),
      this.mastery.getReviewQueue(learnerId, { programId: program.id, limit: 10_000 }),
    ]);
    return summarizeIeltsStudyProgress({ completedSessionCount, attempts, records, dueReviewCount: queue.filter(item => item.priorityReason === 'DUE' || item.priorityReason === 'OVERDUE').length });
  }
}
