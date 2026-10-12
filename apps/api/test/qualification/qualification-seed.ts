import { createHash } from 'node:crypto';
import { canonicalLessonSource } from '@worklingo/test-fixtures';

export interface QualificationDataset {
  readonly auditRows: readonly { id: string; sequence: number }[];
  readonly jobRows: readonly { id: string; sequence: number; status: 'COMPLETED' | 'FAILED' }[];
  readonly lessonSource: string;
  readonly masteryRows: readonly { id: string; sequence: number; skill: string }[];
  readonly fingerprint: string;
}

export function buildQualificationDataset(): QualificationDataset {
  const masteryRows = Array.from({ length: 1_024 }, (_, sequence) => ({
    id: `mastery-${sequence.toString().padStart(4, '0')}`,
    sequence,
    skill: ['reading', 'listening', 'speaking', 'writing'][sequence % 4]!,
  }));
  const auditRows = Array.from({ length: 10_000 }, (_, sequence) => ({
    id: `audit-${sequence.toString().padStart(5, '0')}`,
    sequence,
  }));
  const jobRows = Array.from({ length: 10_000 }, (_, sequence) => ({
    id: `job-${sequence.toString().padStart(5, '0')}`,
    sequence,
    status: sequence % 20 === 0 ? 'FAILED' as const : 'COMPLETED' as const,
  }));
  const padding = 'A clear workplace sentence for deterministic parser qualification. '.repeat(6_800);
  const lessonSource = canonicalLessonSource.replace(
    'Dear Support Team,',
    `Dear Support Team,\n\n${padding}`,
  );
  const fingerprint = createHash('sha256').update(JSON.stringify({ auditRows, jobRows, masteryRows }) + lessonSource).digest('hex');
  return { auditRows, fingerprint, jobRows, lessonSource, masteryRows };
}
