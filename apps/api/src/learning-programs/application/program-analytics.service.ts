import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { programAnalyticsQuerySchema, programAnalyticsSchema } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { parseProgramInput, requireProgramActor } from './program-command.js';

const definitions = {
  cohort: 'Enrollments created in UTC [from,to); cohortStatus is their current status. totalEnrollments includes enrollments created before to. Summary includes unversioned legacy enrollments; release comparisons include pinned enrollments only.',
  activity: 'Distinct learners with a started session or submitted attempt in [from,to), matching enrollment and exact release/curriculum/mission/lesson pins. Planned-only sessions excluded.',
  completion: 'Distinct enrollments with COMPLETED or WITHDRAWN lifecycle events in [from,to), separate from activity coverage and readiness. completionRate divides completed cohort members by cohortEnrollments.',
  projection: 'Latest persisted Task 3 projection created before to across enrollments created before to. Activity completion and readiness remain separate. Missing projections unknown; persisted observations can lag activity.',
  skills: 'Attempt-skill evidence from latest persisted Task 3 projection, completed in [from,to), deduplicated by enrollment/attempt/skill. Only QUALIFIED EVALUATED scores contribute to the mean. Dimension states use latest projection; missing dimensions UNKNOWN.',
  retention: 'Enrollment-created cohort. Dn activity in [enrollment+n days,enrollment+(n+1) days). Denominator includes only entire follow-up windows ending by min(to,generatedAt). Immature enrollments excluded; zero denominator yields null.',
  nodes: 'Frozen authored Level=stage, Mission=unit and exact LessonVersion. Latest persisted observations before to. Stage/unit completes when every bound lesson completes, ready when every lesson ready. Unknown observations excluded from completionRate denominator.',
  review: 'CURRENT mutable schedule at generatedAt for selected enrollments created before to; overdue means dueAt <= generatedAt. Not historical backlog at to. Completed event count is historical [from,to).',
  assessment: 'Checkpoint assessment records created in [from,to) bound through exact release sessions. Recorded status counts do not infer mastery or readiness.',
  comparison: 'All selected releases including empty versions paged in ascending version order, with identical metric definitions. Legacy releases without authored nodes/evidence remain unknown.',
};

@Injectable()
export class ProgramAnalyticsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async aggregate(actorId: string, programId: string, raw: unknown) {
    const query = parseProgramInput(programAnalyticsQuerySchema, raw);
    const from = new Date(query.from), to = new Date(query.to), generatedAt = new Date();
    const observationEnd = new Date(Math.min(to.getTime(), generatedAt.getTime()));
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId, true, false);
      if (!await tx.learningProgram.findUnique({ where: { id: programId }, select: { id: true } })) throw new NotFoundException('Program not found');
      if (query.versionId && !await tx.programVersion.findFirst({ where: { id: query.versionId, programId }, select: { id: true } })) throw new NotFoundException('Program version not found');
      // Learner-sized work stays in PostgreSQL; only aggregates and bounded
      // release/node pages leave it. No private attempt fields are selected.
      const rows = await tx.$queryRaw<{ result: unknown }[]>(Prisma.sql`
WITH versions AS (
 SELECT v.* FROM "ProgramVersion" v WHERE v."programId"=${programId}::uuid
 ${query.versionId ? Prisma.sql`AND v.id=${query.versionId}::uuid` : Prisma.empty}
), enrollments AS (
 SELECT e.* FROM "LearnerProgramEnrollment" e WHERE e."programId"=${programId}::uuid AND e."createdAt"<${to}
 ${query.versionId ? Prisma.sql`AND e."programVersionId"=${query.versionId}::uuid` : Prisma.empty}
), bindings AS (
 SELECT v.id AS version_id,b FROM versions v CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.snapshot->'curriculumBindings','[]'::jsonb)) b
), lessons AS (
 SELECT version_id,b,l FROM bindings CROSS JOIN LATERAL jsonb_array_elements(b->'lessons') l
), sessions AS (
 SELECT s.*,e.id AS enrollment_id,e."programVersionId" AS version_id FROM enrollments e JOIN "LearningSession" s ON s."learnerId"=e."learnerId"
 JOIN lessons l ON l.version_id=e."programVersionId" AND l.b->>'curriculumRevisionId'=s."curriculumRevisionId"::text AND l.b->>'missionId'=s."missionId"::text AND l.l->>'lessonVersionId'=s."lessonVersionId"::text
 WHERE s."planSnapshot"->>'programEnrollmentId'=e.id::text AND s."planSnapshot"->>'programVersionId'=e."programVersionId"::text
 AND s."planSnapshot"->>'lessonVersionId'=s."lessonVersionId"::text AND s."planSnapshot"->>'missionId'=s."missionId"::text
), activity_points AS (
 SELECT enrollment_id,version_id,"learnerId","startedAt" AS at FROM sessions WHERE "startedAt">=${from} AND "startedAt"<${to}
 UNION ALL SELECT s.enrollment_id,s.version_id,s."learnerId",a."createdAt" FROM sessions s JOIN "ActivityAttempt" a ON a."sessionId"=s.id AND a."learnerId"=s."learnerId" WHERE a."createdAt">=${from} AND a."createdAt"<${to}
), active AS (
 SELECT DISTINCT enrollment_id FROM activity_points WHERE at>=${from} AND at<${to}
), events AS (
 SELECT DISTINCT ev."enrollmentId" AS enrollment_id,ev.type FROM "EnrollmentEvent" ev JOIN enrollments e ON e.id=ev."enrollmentId"
 WHERE ev."createdAt">=${from} AND ev."createdAt"<${to} AND ev.type IN ('COMPLETED','WITHDRAWN')
), latest AS (
 SELECT e.id AS enrollment_id,e."programVersionId" AS version_id,p.projection,p.evidence FROM enrollments e
 JOIN LATERAL (SELECT projection,evidence FROM "ProgressionSnapshot" p WHERE p."enrollmentId"=e.id AND p."programVersionId"=e."programVersionId" AND p."createdAt"<${to} ORDER BY p.revision DESC LIMIT 1) p ON true
), metrics AS (
 SELECT e.id,e."programVersionId" AS version_id,e."learnerId",e.status,e."createdAt">=${from} AS cohort,a.enrollment_id IS NOT NULL AS active,
 EXISTS(SELECT 1 FROM events ev WHERE ev.enrollment_id=e.id AND ev.type='COMPLETED') AS completed,EXISTS(SELECT 1 FROM events ev WHERE ev.enrollment_id=e.id AND ev.type='WITHDRAWN') AS withdrawn,
 p.enrollment_id IS NOT NULL AS observed,COALESCE((p.projection->>'completed')::boolean,false) AS activity_completed,COALESCE((p.projection->>'ready')::boolean,false) AS ready
 FROM enrollments e LEFT JOIN latest p ON p.enrollment_id=e.id LEFT JOIN active a ON a.enrollment_id=e.id
), grouped AS (
 SELECT version_id,GROUPING(version_id) AS all_versions,jsonb_build_object(
 'totalEnrollments',count(*),'cohortEnrollments',count(*) FILTER(WHERE cohort),
 'cohortStatus',jsonb_build_object('ACTIVE',count(*) FILTER(WHERE cohort AND status='ACTIVE'),'SUSPENDED',count(*) FILTER(WHERE cohort AND status='SUSPENDED'),'COMPLETED',count(*) FILTER(WHERE cohort AND status='COMPLETED'),'WITHDRAWN',count(*) FILTER(WHERE cohort AND status='WITHDRAWN')),
 'activeLearners',count(DISTINCT "learnerId") FILTER(WHERE active),'completedEnrollments',count(*) FILTER(WHERE completed),'withdrawnEnrollments',count(*) FILTER(WHERE withdrawn),
 'projectedEnrollments',count(*) FILTER(WHERE observed),'activityCompletedEnrollments',count(*) FILTER(WHERE activity_completed),'readyEnrollments',count(*) FILTER(WHERE ready),'unknownProjectionEnrollments',count(*) FILTER(WHERE NOT observed),
 'completionRate',count(*) FILTER(WHERE cohort AND completed)::float/NULLIF(count(*) FILTER(WHERE cohort),0)) AS value
 FROM metrics GROUP BY GROUPING SETS ((),(version_id))
), empty_metrics AS (
 SELECT jsonb_build_object('totalEnrollments',0,'cohortEnrollments',0,'cohortStatus',jsonb_build_object('ACTIVE',0,'SUSPENDED',0,'COMPLETED',0,'WITHDRAWN',0),'activeLearners',0,'completedEnrollments',0,'withdrawnEnrollments',0,'projectedEnrollments',0,'activityCompletedEnrollments',0,'readyEnrollments',0,'unknownProjectionEnrollments',0,'completionRate',null) AS value
), version_page AS (
 SELECT v.version,jsonb_build_object('versionId',v.id,'version',v.version,'title',COALESCE(v.snapshot->>'title','Captured legacy release'),'source',v.source)||COALESCE(g.value,empty_metrics.value) AS value
 FROM versions v CROSS JOIN empty_metrics LEFT JOIN grouped g ON g.version_id=v.id AND g.all_versions=0 ORDER BY v.version,v.id LIMIT ${query.limit} OFFSET ${(query.versionPage - 1) * query.limit}
), node_definitions AS (
 SELECT version_id,'lesson'::text AS type,b->>'pathId' AS path_id,b->>'levelId' AS level_id,b->>'missionId' AS mission_id,b->>'curriculumRevisionId' AS curriculum_id,l->>'lessonVersionId' AS lesson_id,l->>'title' AS title FROM lessons
 UNION ALL SELECT version_id,'unit',b->>'pathId',b->>'levelId',b->>'missionId',b->>'curriculumRevisionId',null,b->>'title' FROM bindings
 UNION SELECT version_id,'stage',b->>'pathId',b->>'levelId',null,null,null,COALESCE(b->>'levelTitle','Captured stage') FROM bindings
), paged_node_definitions AS (
 SELECT * FROM node_definitions ORDER BY version_id,type,level_id,mission_id,lesson_id LIMIT ${query.limit} OFFSET ${(query.nodePage - 1) * query.limit}
), node_observations AS (
 SELECT n.*,e.id AS enrollment_id,o.item_count,o.observed,o.completed,o.ready FROM paged_node_definitions n
 LEFT JOIN enrollments e ON e."programVersionId"=n.version_id LEFT JOIN latest p ON p.enrollment_id=e.id
 LEFT JOIN LATERAL (SELECT count(*) AS item_count,count(i) AS observed,bool_and(COALESCE((i->>'completed')::boolean,false)) AS completed,bool_and(COALESCE((i->>'ready')::boolean,false)) AS ready
 FROM lessons l LEFT JOIN LATERAL (SELECT item AS i FROM jsonb_array_elements(COALESCE(p.projection->'items','[]'::jsonb)) item WHERE item->>'curriculumRevisionId'=l.b->>'curriculumRevisionId' AND item->>'lessonVersionId'=l.l->>'lessonVersionId') item ON true
 WHERE l.version_id=n.version_id AND l.b->>'levelId'=n.level_id AND (n.curriculum_id IS NULL OR l.b->>'curriculumRevisionId'=n.curriculum_id) AND (n.lesson_id IS NULL OR l.l->>'lessonVersionId'=n.lesson_id)) o ON true
), node_groups AS (
 SELECT version_id,type,path_id,level_id,mission_id,curriculum_id,lesson_id,title,jsonb_build_object('versionId',version_id,'type',type,'pathId',path_id,'levelId',level_id,'missionId',mission_id,'curriculumRevisionId',curriculum_id,'lessonVersionId',lesson_id,'title',title,
 'totalEnrollments',count(enrollment_id),'observedEnrollments',count(enrollment_id) FILTER(WHERE observed=item_count),'unknownEnrollments',count(enrollment_id) FILTER(WHERE observed<item_count),
 'completedEnrollments',count(enrollment_id) FILTER(WHERE observed=item_count AND completed),'readyEnrollments',count(enrollment_id) FILTER(WHERE observed=item_count AND ready),
 'completionRate',count(enrollment_id) FILTER(WHERE observed=item_count AND completed)::float/NULLIF(count(enrollment_id) FILTER(WHERE observed=item_count),0)) AS value
 FROM node_observations GROUP BY version_id,type,path_id,level_id,mission_id,curriculum_id,lesson_id,title
), node_page AS (
 SELECT value FROM node_groups ORDER BY version_id,type,level_id,mission_id,lesson_id
), dimensions AS (
 SELECT dimension FROM unnest(ARRAY['reading','listening','speaking','writing','vocabulary','grammar','pronunciation']) dimension
), evidence AS (
 SELECT DISTINCT ON (p.enrollment_id,a->>'attemptId',a->>'skill') p.enrollment_id,a FROM latest p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.evidence->'attempts','[]'::jsonb)) a
 WHERE (a->>'completedAt')::timestamptz>=${from} AND (a->>'completedAt')::timestamptz<${to} AND a->>'enrollmentId'=p.enrollment_id::text AND a->>'programVersionId'=p.version_id::text
), skill_groups AS (
 SELECT d.dimension,jsonb_build_object('dimension',d.dimension,
 'qualifiedAttempts',(SELECT count(*) FROM evidence WHERE a->>'skill'=d.dimension AND a->>'qualification'='QUALIFIED' AND a->>'evaluationStatus'='EVALUATED' AND (a->>'score')::float BETWEEN 0 AND 1),
 'pendingAttempts',(SELECT count(*) FROM evidence WHERE a->>'skill'=d.dimension AND a->>'qualification'='PENDING'),'unqualifiedAttempts',(SELECT count(*) FROM evidence WHERE a->>'skill'=d.dimension AND a->>'qualification'='UNQUALIFIED'),
 'meanQualifiedScore',(SELECT avg((a->>'score')::float) FROM evidence WHERE a->>'skill'=d.dimension AND a->>'qualification'='QUALIFIED' AND a->>'evaluationStatus'='EVALUATED' AND (a->>'score')::float BETWEEN 0 AND 1),
 'unknownEnrollments',count(e.id) FILTER(WHERE COALESCE(state.status,'UNKNOWN')='UNKNOWN'),'pendingEnrollments',count(e.id) FILTER(WHERE state.status='PENDING'),
 'developingEnrollments',count(e.id) FILTER(WHERE state.status='DEVELOPING'),'masteredEnrollments',count(e.id) FILTER(WHERE state.status='MASTERED')) AS value
 FROM dimensions d LEFT JOIN enrollments e ON true LEFT JOIN latest p ON p.enrollment_id=e.id
 LEFT JOIN LATERAL (SELECT item->>'status' AS status FROM jsonb_array_elements(COALESCE(p.projection->'evidenceDimensions','[]'::jsonb)) item WHERE item->>'dimension'=d.dimension LIMIT 1) state ON true GROUP BY d.dimension
), retention AS (
 SELECT day,jsonb_build_object('day',day,'matureEnrollments',count(e.id),'retainedEnrollments',count(e.id) FILTER(WHERE EXISTS(SELECT 1 FROM activity_points a WHERE a.enrollment_id=e.id AND a.at>=e."createdAt"+day*interval '1 day' AND a.at<e."createdAt"+(day+1)*interval '1 day')),
 'rate',count(e.id) FILTER(WHERE EXISTS(SELECT 1 FROM activity_points a WHERE a.enrollment_id=e.id AND a.at>=e."createdAt"+day*interval '1 day' AND a.at<e."createdAt"+(day+1)*interval '1 day'))::float/NULLIF(count(e.id),0)) AS value
 FROM unnest(ARRAY[1,7,30]) day LEFT JOIN enrollments e ON e."createdAt">=${from} AND e."createdAt"+(day+1)*interval '1 day'<=${observationEnd} GROUP BY day
), assessment_groups AS (
 SELECT c.status,count(*) AS count FROM "CheckpointAssessment" c JOIN sessions s ON s.id=c."sessionId" AND s."learnerId"=c."learnerId" AND s."lessonVersionId"=c."lessonVersionId"
 WHERE c."createdAt">=${from} AND c."createdAt"<${to} GROUP BY c.status
)
SELECT jsonb_build_object('summary',(SELECT value FROM grouped WHERE all_versions=1),
 'versions',jsonb_build_object('items',COALESCE((SELECT jsonb_agg(value ORDER BY version) FROM version_page),'[]'::jsonb),'total',(SELECT count(*) FROM versions),'page',${query.versionPage}::int,'limit',${query.limit}::int),
 'nodes',jsonb_build_object('items',COALESCE((SELECT jsonb_agg(value) FROM node_page),'[]'::jsonb),'total',(SELECT count(*) FROM node_definitions),'page',${query.nodePage}::int,'limit',${query.limit}::int),
 'skills',(SELECT jsonb_agg(value ORDER BY dimension) FROM skill_groups),'retention',(SELECT jsonb_agg(value ORDER BY day) FROM retention),
 'reviews',jsonb_build_object('basis','CURRENT','asOf',${generatedAt.toISOString()}::text,
 'scheduled',(SELECT count(*) FROM "ProgramReview" r JOIN enrollments e ON e.id=r."enrollmentId"),'overdue',(SELECT count(*) FROM "ProgramReview" r JOIN enrollments e ON e.id=r."enrollmentId" WHERE r."dueAt"<=${generatedAt}),
 'completedEventsInWindow',(SELECT count(*) FROM "ProgramReviewEvent" ev JOIN "ProgramReview" r ON r.id=ev."reviewId" JOIN enrollments e ON e.id=r."enrollmentId" WHERE ev.type='COMPLETED' AND ev."createdAt">=${from} AND ev."createdAt"<${to})),
 'assessments',jsonb_build_object('total',COALESCE((SELECT sum(count) FROM assessment_groups),0),'statuses',COALESCE((SELECT jsonb_agg(jsonb_build_object('status',status,'count',count) ORDER BY status) FROM assessment_groups),'[]'::jsonb))) AS result`);
      return programAnalyticsSchema.parse({ ...(rows[0]!.result as object), programId, versionId: query.versionId ?? null, from: from.toISOString(), to: to.toISOString(), generatedAt: generatedAt.toISOString(), definitions });
    }, { isolationLevel: 'RepeatableRead', timeout: 15000 });
  }
}
