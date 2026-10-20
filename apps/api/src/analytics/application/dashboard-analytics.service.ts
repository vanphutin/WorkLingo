import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  adminDashboardOverviewSchema, learnerDashboardAnalyticsSchema,
  type AdminDashboardOverview, type LearnerDashboardAnalytics,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ProgramContextService } from '../../learning-programs/application/program-context.service.js';
import { deriveProgramAccess } from '../../learning-programs/domain/program-availability.js';

const DAY_MS = 86_400_000;

function reportingWindow(now: Date) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const from = new Date(today - 13 * DAY_MS);
  const to = new Date(today + DAY_MS);
  return { from, to, dates: Array.from({ length: 14 }, (_, index) => new Date(from.getTime() + index * DAY_MS).toISOString().slice(0, 10)) };
}

type ActivityRow = { dateKey: string; startedSessions: number; completedSessions: number };

// Published curriculum revisions, rather than session counts, define the milestone denominator.
const publishedCurriculum = Prisma.sql`
  SELECT DISTINCT ON (m.id) m.id AS "missionId", p."programId", cr.id AS "revisionId"
  FROM "Mission" m
  JOIN "Level" l ON l.id = m."levelId" AND l.status = 'PUBLISHED'
  JOIN "LearningPath" p ON p.id = l."pathId" AND p.status = 'PUBLISHED'
  JOIN "CurriculumRevision" cr ON cr."missionId" = m.id AND cr.status = 'PUBLISHED'
  WHERE m.purpose = 'LEARNING' AND m.status = 'PUBLISHED'
  ORDER BY m.id, cr.revision DESC`;

@Injectable()
export class DashboardAnalyticsService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ProgramContextService) private readonly programContext: ProgramContextService,
  ) {}

  async overview(now = new Date()): Promise<AdminDashboardOverview> {
    const { from, to, dates } = reportingWindow(now);
    const since = new Date(now.getTime() - 7 * DAY_MS);
    return this.database.$transaction(async (tx) => {
      const [totalLearners, activeRows, programs, activity, recent] = await Promise.all([
        tx.user.count({ where: { role: 'LEARNER' } }),
        tx.$queryRaw<{ count: number }[]>`
          SELECT COUNT(DISTINCT s."learnerId")::int AS count FROM "LearningSession" s
          JOIN "User" u ON u.id = s."learnerId" AND u.role = 'LEARNER'
          JOIN "Mission" m ON m.id = s."missionId" AND m.purpose = 'LEARNING'
          WHERE s.status <> 'PLANNED' AND s."updatedAt" >= ${since} AND s."updatedAt" <= ${now}`,
        tx.$queryRaw<AdminDashboardOverview['programs']>(Prisma.sql`
          WITH missions AS (
            SELECT p."programId", COUNT(*)::int AS count FROM "Mission" m
            JOIN "Level" l ON l.id = m."levelId" AND l.status = 'PUBLISHED'
            JOIN "LearningPath" p ON p.id = l."pathId" AND p.status = 'PUBLISHED'
            WHERE m.purpose = 'LEARNING' AND m.status = 'PUBLISHED' GROUP BY p."programId"
          ),
          enrollments AS (
            SELECT e."programId", COUNT(*)::int AS count FROM "LearnerProgramEnrollment" e
            JOIN "User" u ON u.id = e."learnerId" AND u.role = 'LEARNER' GROUP BY e."programId"
          ), sessions AS (
            SELECT p."programId", COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE s.status = 'COMPLETED')::int AS completed
            FROM "LearningSession" s JOIN "Mission" m ON m.id = s."missionId" AND m.purpose = 'LEARNING'
            JOIN "Level" l ON l.id = m."levelId" JOIN "LearningPath" p ON p.id = l."pathId"
            JOIN "User" u ON u.id = s."learnerId" AND u.role = 'LEARNER'
            WHERE s.status <> 'PLANNED' GROUP BY p."programId"
          )
          SELECT p.id, p.slug, p.name, p."availabilityStatus",
            COALESCE(e.count, 0)::int AS enrollments, COALESCE(m.count, 0)::int AS "publishedMissions",
            COALESCE(s.total, 0)::int AS "totalSessions", COALESCE(s.completed, 0)::int AS "completedSessions"
          FROM "LearningProgram" p LEFT JOIN enrollments e ON e."programId" = p.id
          LEFT JOIN missions m ON m."programId" = p.id LEFT JOIN sessions s ON s."programId" = p.id
          ORDER BY p."displayOrder", p.id`),
        this.activity(tx, from, to),
        tx.learningSession.findMany({
          where: { status: { not: 'PLANNED' }, learner: { role: 'LEARNER' }, mission: { purpose: 'LEARNING' } },
          select: { id: true, status: true, updatedAt: true, mission: { select: { title: true, level: { select: { path: { select: { program: { select: { name: true } } } } } } } } },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 10,
        }),
      ]);
      const totals = programs.reduce((sum, program) => ({
        sessions: sum.sessions + program.totalSessions, completed: sum.completed + program.completedSessions,
        enrollments: sum.enrollments + program.enrollments,
      }), { sessions: 0, completed: 0, enrollments: 0 });
      const daily = new Map(activity.map((day) => [day.dateKey, day]));
      return adminDashboardOverviewSchema.parse({
        totalLearners, activeLearners7d: activeRows[0]?.count ?? 0, programEnrollments: totals.enrollments,
        sessionCompletionRate: totals.sessions === 0 ? null : totals.completed / totals.sessions, programs,
        activity: dates.map((dateKey) => daily.get(dateKey) ?? { dateKey, startedSessions: 0, completedSessions: 0 }),
        recentActivity: recent.map((session) => ({
          id: session.id, status: session.status, updatedAt: session.updatedAt.toISOString(),
          missionTitle: session.mission.title, programName: session.mission.level.path.program.name,
        })),
      });
    }, { isolationLevel: 'RepeatableRead' });
  }

  async learner(learnerId: string, now = new Date()): Promise<LearnerDashboardAnalytics> {
    const { from, to, dates } = reportingWindow(now);
    return this.database.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: learnerId }, select: { displayName: true, profile: { select: { onboardingStatus: true } } } });
      if (!user) throw new NotFoundException('Learner not found');
      const context = user.profile?.onboardingStatus === 'COMPLETE' ? await this.programContext.resolve(learnerId, tx) : null;
      const programId = context?.programId ?? null;
      const scope = Prisma.sql`s."learnerId" = ${learnerId}::uuid AND p."programId" = ${programId}::uuid`;
      const evaluated = Prisma.sql`
        FROM "ActivityAttempt" a JOIN "LearningSession" s ON s.id = a."sessionId" AND s."learnerId" = a."learnerId"
        JOIN "Mission" m ON m.id = s."missionId" AND m.purpose = 'LEARNING'
        JOIN "Level" l ON l.id = m."levelId" JOIN "LearningPath" p ON p.id = l."pathId"
        JOIN "Activity" activity ON activity.id = a."activityId"
        WHERE ${scope} AND a."evaluationStatus" = 'EVALUATED' AND a.score BETWEEN 0 AND 1
          AND a."createdAt" >= ${from} AND a."createdAt" < ${to}`;
      const [programs, activity, accuracyTrend, skills] = await Promise.all([
        tx.$queryRaw<LearnerDashboardAnalytics['programs']>(Prisma.sql`
          WITH curriculum AS (${publishedCurriculum}),
          published_lessons AS (
            SELECT DISTINCT c."programId", crl."lessonVersionId" FROM curriculum c
            JOIN "CurriculumRevisionLesson" crl ON crl."curriculumRevisionId" = c."revisionId"
            UNION
            SELECT p."programId", lv.id AS "lessonVersionId" FROM "Mission" m
            JOIN "Level" l ON l.id = m."levelId" AND l.status = 'PUBLISHED'
            JOIN "LearningPath" p ON p.id = l."pathId" AND p.status = 'PUBLISHED'
            JOIN "MissionLesson" ml ON ml."missionId" = m.id
            JOIN "Lesson" lesson ON lesson.id = ml."lessonId"
            JOIN "LessonVersion" lv ON lv.id = lesson."currentPublishedVersionId" AND lv.status = 'PUBLISHED'
            WHERE m.purpose = 'LEARNING' AND m.status = 'PUBLISHED'
              AND NOT EXISTS (SELECT 1 FROM curriculum c WHERE c."missionId" = m.id)
          ), missions AS (SELECT "programId", COUNT(*)::int AS count FROM curriculum GROUP BY "programId"),
          lessons AS (SELECT "programId", COUNT(*)::int AS count FROM published_lessons GROUP BY "programId"),
          completions AS (
            SELECT e."programId", COUNT(DISTINCT c."missionId")::int AS count
            FROM "CurriculumCompletion" cc JOIN "LearnerProgramEnrollment" e ON e.id = cc."enrollmentId"
            JOIN curriculum c ON c."revisionId" = cc."curriculumRevisionId" AND c."programId" = e."programId"
            WHERE e."learnerId" = ${learnerId}::uuid GROUP BY e."programId"
          ), completed_lessons AS (
            SELECT p."programId", COUNT(DISTINCT s."lessonVersionId")::int AS count
            FROM "LearningSession" s JOIN "Mission" m ON m.id = s."missionId" AND m.purpose = 'LEARNING'
            JOIN "Level" l ON l.id = m."levelId" JOIN "LearningPath" p ON p.id = l."pathId"
            JOIN published_lessons pl ON pl."programId" = p."programId" AND pl."lessonVersionId" = s."lessonVersionId"
            WHERE s."learnerId" = ${learnerId}::uuid AND s.status = 'COMPLETED' GROUP BY p."programId"
          )
          SELECT p.id, p.slug, p.name, p."availabilityStatus", (e.id IS NOT NULL) AS enrolled,
            COALESCE(p.id = ${programId}::uuid, false) AS active,
            CASE WHEN l."pathId" IN (SELECT id FROM "LearningPath" WHERE "programId" = p.id) THEN l.code ELSE NULL END AS "currentLevelCode",
            COALESCE(m.count, 0)::int AS "totalMissions", COALESCE(c.count, 0)::int AS "completedMissions",
            COALESCE(lessons.count, 0)::int AS "totalLessons", COALESCE(cl.count, 0)::int AS "completedLessons"
          FROM "LearningProgram" p LEFT JOIN "LearnerProgramEnrollment" e ON e."programId" = p.id AND e."learnerId" = ${learnerId}::uuid
          LEFT JOIN "Level" l ON l.id = e."currentLevelId" LEFT JOIN missions m ON m."programId" = p.id
          LEFT JOIN completions c ON c."programId" = p.id LEFT JOIN lessons ON lessons."programId" = p.id
          LEFT JOIN completed_lessons cl ON cl."programId" = p.id
          WHERE p."availabilityStatus" <> 'DISABLED' ORDER BY p."displayOrder", p.id`),
        this.activity(tx, from, to, { learnerId, programId }),
        tx.$queryRaw<LearnerDashboardAnalytics['accuracyTrend']>(Prisma.sql`
          SELECT to_char(a."createdAt", 'YYYY-MM-DD') AS "dateKey", AVG(a.score)::float8 AS "averageScore", COUNT(*)::int AS samples
          ${evaluated} GROUP BY to_char(a."createdAt", 'YYYY-MM-DD') ORDER BY "dateKey"`),
        tx.$queryRaw<LearnerDashboardAnalytics['skills']>(Prisma.sql`
          SELECT activity."activityType"::text AS skill, AVG(a.score)::float8 AS "averageScore", COUNT(*)::int AS samples
          ${evaluated} GROUP BY activity."activityType" ORDER BY skill`),
      ]);
      const daily = new Map(activity.map((day) => [day.dateKey, day]));
      return learnerDashboardAnalyticsSchema.parse({
        displayName: user.displayName, activeProgramSlug: context?.programSlug ?? null,
        activity: dates.map((dateKey) => ({ dateKey, sessions: daily.get(dateKey)?.startedSessions ?? 0, completedSessions: daily.get(dateKey)?.completedSessions ?? 0 })),
        accuracyTrend, skills,
        programs: programs.map((program) => ({ ...program,
          availabilityStatus: !deriveProgramAccess(program).isSelectable && (program.availabilityStatus === 'AVAILABLE' || program.availabilityStatus === 'BETA') ? 'COMING_SOON' : program.availabilityStatus,
          completedLessons: program.enrolled ? program.completedLessons : 0,
          completedMissions: program.enrolled ? program.completedMissions : 0,
        })),
      });
    }, { isolationLevel: 'RepeatableRead' });
  }

  private activity(tx: Prisma.TransactionClient, from: Date, to: Date, scope?: { learnerId: string; programId: string | null }): Promise<ActivityRow[]> {
    const filter = scope ? Prisma.sql`AND s."learnerId" = ${scope.learnerId}::uuid AND p."programId" = ${scope.programId}::uuid` : Prisma.empty;
    return tx.$queryRaw<ActivityRow[]>(Prisma.sql`
      WITH scoped AS (
        SELECT s."startedAt", s."completedAt", s.status FROM "LearningSession" s
        JOIN "User" u ON u.id = s."learnerId" AND u.role = 'LEARNER'
        JOIN "Mission" m ON m.id = s."missionId" AND m.purpose = 'LEARNING'
        JOIN "Level" l ON l.id = m."levelId" JOIN "LearningPath" p ON p.id = l."pathId"
        WHERE s.status <> 'PLANNED' ${filter}
          AND ((s."startedAt" >= ${from} AND s."startedAt" < ${to}) OR (s."completedAt" >= ${from} AND s."completedAt" < ${to}))
      ), events AS (
        SELECT to_char("startedAt", 'YYYY-MM-DD') AS day, 1 AS started, 0 AS completed FROM scoped WHERE "startedAt" >= ${from} AND "startedAt" < ${to}
        UNION ALL
        SELECT to_char("completedAt", 'YYYY-MM-DD') AS day, 0 AS started, 1 AS completed FROM scoped WHERE status = 'COMPLETED' AND "completedAt" >= ${from} AND "completedAt" < ${to}
      )
      SELECT day AS "dateKey", SUM(started)::int AS "startedSessions", SUM(completed)::int AS "completedSessions" FROM events GROUP BY day ORDER BY day`);
  }
}
