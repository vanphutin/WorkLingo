import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { learningSkillSchema, sessionPlanSchema, type LearningSkill } from '@worklingo/contracts';

import { lessonSnapshotSchema, type LessonSnapshot } from '../../curriculum/domain/curriculum.types.js';
import type { CheckpointEvidence } from '../domain/checkpoint-policy.js';
import { computeAvailableDurations } from '../../learning-sessions/domain/session-planner.js';

export const checkpointSessionInclude = {
  mission: { include: { level: true } },
  lessonVersion: true,
  attempts: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.LearningSessionInclude;
export type CheckpointSession = Prisma.LearningSessionGetPayload<{ include: typeof checkpointSessionInclude }>;

export function frozenActivities(session: CheckpointSession) {
  const parsed = sessionPlanSchema.safeParse(session.planSnapshot);
  const lesson = lessonSnapshotSchema.safeParse(session.lessonVersion.parsedContent);
  if (!parsed.success || !lesson.success || parsed.data.missionId !== session.missionId ||
      parsed.data.lessonVersionId !== session.lessonVersionId || parsed.data.durationMinutes !== session.durationMinutes ||
      !['PUBLISHED', 'ARCHIVED'].includes(session.lessonVersion.status)) {
    throw new ConflictException('Session has no valid frozen checkpoint plan');
  }
  const activityIds = parsed.data.blocks.flatMap((block) => block.activityIds);
  const activities = activityIds.map((id) => lesson.data.activities.find((activity) => activity.id === id));
  if (activities.some((activity) => !activity) ||
      !learningSkillSchema.options.every((skill) => activities.some((activity) => activity?.skills.includes(skill)))) {
    throw new ConflictException('Session frozen activities do not cover all four skills');
  }
  const blocksBySlug = new Map(lesson.data.wordBanks.flatMap((bank) => bank.languageBlocks).map((block) => [block.slug, block.id]));
  return activities.map((activity) => {
    if (!activity) throw new ConflictException('Frozen activity is missing');
    return {
      id: activity.id,
      skills: activity.skills,
      languageBlockIds: activity.languageBlockReferences.map((slug) => blocksBySlug.get(slug)!),
      attempts: session.attempts.filter((attempt) => attempt.activityId === activity.id).map((attempt) => ({
        id: attempt.id, evaluationStatus: attempt.evaluationStatus, score: attempt.score,
      })),
    };
  });
}

const publishedLessonsInclude = {
  lessons: {
    // Increment 3 plays one lesson per mission, exactly as CurriculumService selects it.
    // Later lessons must neither introduce unreachable mastery requirements nor enable an unlock.
    where: {
      lesson: {
        OR: [
          { currentPublishedVersion: { status: 'PUBLISHED' } },
          { versions: { some: { status: 'PUBLISHED' } } },
        ],
      },
    },
    orderBy: { order: 'asc' },
    take: 1,
    include: {
      lesson: {
        include: {
          currentPublishedVersion: true,
          versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1 },
        },
      },
    },
  },
} satisfies Prisma.MissionInclude;
type PublishedMission = Prisma.MissionGetPayload<{ include: typeof publishedLessonsInclude }>;

function publishedSnapshots(mission: PublishedMission): LessonSnapshot[] {
  return mission.lessons.flatMap(({ lesson }) => {
    const version = lesson.currentPublishedVersion?.status === 'PUBLISHED'
      ? lesson.currentPublishedVersion : lesson.versions[0];
    if (!version) return [];
    const parsed = lessonSnapshotSchema.safeParse(version.parsedContent);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function availableNextLevel(database: Prisma.TransactionClient, levelCode: string): Promise<string | null> {
  const current = await database.level.findUnique({ where: { code: levelCode } });
  if (!current) return null;
  // Resolve the immediate successor first. Filtering by content here could skip an unready level.
  const next = await database.level.findFirst({
    where: { pathId: current.pathId, order: { gt: current.order }, path: { status: 'PUBLISHED' } },
    orderBy: { order: 'asc' },
    include: { missions: { where: { status: 'PUBLISHED' }, include: publishedLessonsInclude } },
  });
  if (!next) return null;
  // Every required published mission must be startable, not merely contain four skill names.
  const hasContent = next.missions.length > 0 && next.missions.every((mission) => publishedSnapshots(mission).some((snapshot) =>
    computeAvailableDurations({ lessonVersion: snapshot }).length > 0,
  ));
  return hasContent ? next.code : null;
}

export async function readCheckpointEvidence(
  database: Prisma.TransactionClient, learnerId: string, levelCode: string, session?: CheckpointSession,
): Promise<CheckpointEvidence> {
  const missions = await database.mission.findMany({
    where: { status: 'PUBLISHED', level: { code: levelCode, path: { status: 'PUBLISHED' } } },
    include: publishedLessonsInclude,
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  const completed = await database.learningSession.findMany({
    where: { learnerId, status: 'COMPLETED', missionId: { in: missions.map((mission) => mission.id) } },
    select: { missionId: true }, distinct: ['missionId'],
  });
  const completedIds = new Set(completed.map((item) => item.missionId));
  const requirements = new Map<string, { skill: LearningSkill; languageBlockId: string }>();
  let curriculumReady = missions.length > 0;
  for (const mission of missions) {
    const snapshots = publishedSnapshots(mission);
    if (snapshots.length === 0 || !snapshots.every((snapshot) =>
      computeAvailableDurations({ lessonVersion: snapshot }).length > 0,
    )) curriculumReady = false;
    for (const snapshot of snapshots) {
      const blockIds = new Map(snapshot.wordBanks.flatMap((bank) => bank.languageBlocks).map((block) => [block.slug, block.id]));
      for (const activity of snapshot.activities) {
        for (const skill of activity.skills) {
          for (const slug of activity.languageBlockReferences) {
            const languageBlockId = blockIds.get(slug)!;
            requirements.set(`${skill}:${languageBlockId}`, { skill, languageBlockId });
          }
        }
      }
    }
  }
  if (!learningSkillSchema.options.every((skill) => [...requirements.values()].some((block) => block.skill === skill))) {
    curriculumReady = false;
  }
  const mastery = await database.masteryRecord.findMany({
    where: {
      learnerId,
      languageBlockId: { in: [...new Set([...requirements.values()].map((block) => block.languageBlockId))] },
      lastEvidenceAt: { not: null },
      events: { some: { learnerId, attempt: { learnerId, evaluationStatus: 'EVALUATED', score: { not: null } } } },
    },
    select: { skill: true, languageBlockId: true, score: true },
  });
  const scores = new Map(mastery.map((record) => [`${record.skill}:${record.languageBlockId}`, record.score]));
  return {
    activities: session ? frozenActivities(session) : [],
    requiredBlocks: [...requirements.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, block]) => ({
      ...block, score: scores.get(key) ?? null,
    })),
    curriculumReady,
    allMissionsCompleted: missions.length > 0 && missions.every((mission) => completedIds.has(mission.id)),
  };
}
