import { z } from 'zod';
import { learningProgramIconKeySchema } from './learning-program.contracts.ts';

const uuid = z.uuid().transform(value => value.toLowerCase());
const text = z.string().trim().min(1).max(200);
const objectives = z.array(z.string().trim().min(1).max(1000)).max(100);
const ids = z.array(uuid).max(500).refine(values => new Set(values).size === values.length, 'Duplicate references');
const uniqueText = (max: number) => z.array(text).min(1).max(max).refine(values => new Set(values).size === values.length, 'Duplicate values');
export const programVersionStatusSchema = z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED']);
export const programEnrollmentStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'COMPLETED', 'WITHDRAWN']);
export const programPolicySchema = z.object({
  version: z.literal(1),
  sequential: z.object({ stages: z.boolean(), units: z.boolean(), lessons: z.boolean() }).strict(),
  completion: z.object({ requiredActivityRatio: z.number().gt(0).max(1) }).strict(),
  mastery: z.object({ required: z.boolean(), threshold: z.number().min(0).max(1), minimumQualifiedAttempts: z.number().int().min(1).max(100) }).strict(),
  retry: z.object({ maxAttempts: z.number().int().min(1).max(100), cooldownMinutes: z.number().int().min(0).max(525600) }).strict(),
  remediation: z.object({ enabled: z.boolean(), afterAttempts: z.number().int().min(1).max(100) }).strict(),
  review: z.object({ scheduleVersion: z.literal('program-review-v1'), intervalsDays: z.array(z.number().int().min(1).max(3650)).min(1).max(20), requiredForReadiness: z.boolean() }).strict(),
}).strict().superRefine((value, ctx) => {
  const intervals = value.review.intervalsDays;
  if (new Set(intervals).size !== intervals.length || intervals.some((day, index) => index > 0 && day <= intervals[index - 1]!)) {
    ctx.addIssue({ code: 'custom', path: ['review', 'intervalsDays'], message: 'Review intervals must be strictly increasing and unique' });
  }
  if (value.remediation.enabled && value.remediation.afterAttempts > value.retry.maxAttempts) {
    ctx.addIssue({ code: 'custom', path: ['remediation', 'afterAttempts'], message: 'Remediation threshold cannot exceed retry attempts' });
  }
});
export const programLessonSnapshotSchema = z.object({
  lessonVersionId: uuid, order: z.number().int().min(1).max(10000), title: text, objectives,
  estimatedMinutes: z.number().int().min(1).max(100000), difficulty: text, activityIds: z.array(uuid).min(1).max(500).refine(values => new Set(values).size === values.length, 'Duplicate activity references'),
  vocabularyRefs: z.array(z.object({ lexicalEntryId: uuid, senseId: uuid }).strict()).max(1000).superRefine((refs, ctx) => {
    const keys = refs.map(ref => `${ref.lexicalEntryId}:${ref.senseId}`);
    if (new Set(keys).size !== keys.length) ctx.addIssue({ code: 'custom', message: 'Duplicate vocabulary references' });
  }),
  resourceRefs: z.array(z.object({ id: text, type: text, url: z.url().max(2000).optional() }).strict()).max(100),
}).strict();
export const programCurriculumBindingSchema = z.object({
  curriculumRevisionId: uuid, pathId: uuid, levelId: uuid, missionId: uuid,
  order: z.number().int().min(1).max(10000), title: text, objectives, required: z.boolean(), prerequisiteRevisionIds: ids,
  lessons: z.array(programLessonSnapshotSchema).min(1).max(500),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.lessons.map(lesson => lesson.lessonVersionId)).size !== value.lessons.length) {
    ctx.addIssue({ code: 'custom', path: ['lessons'], message: 'Duplicate lesson pins' });
  }
  if (value.lessons.some((lesson, index) => lesson.order !== index + 1)) {
    ctx.addIssue({ code: 'custom', path: ['lessons'], message: 'Lessons must be contiguous and ordered' });
  }
});
const snapshot = {
  title: text, description: z.string().trim().min(1).max(4000), objectives,
  estimatedMinutes: z.number().int().min(1).max(1000000), difficulty: text,
  supportedLanguages: uniqueText(20).default(['en']), audiences: uniqueText(50).default(['adult']), proficiencyLabel: text.optional(),
  catalogMetadata: z.object({ iconKey: learningProgramIconKeySchema, displayOrder: z.number().int().min(1).max(100000) }).strict().optional(),
  policy: programPolicySchema, curriculumBindings: z.array(programCurriculumBindingSchema).min(1).max(500),
};
export const programVersionInputSchema = z.object(snapshot).strict().superRefine((value, ctx) => {
  const bindings = value.curriculumBindings;
  const ids = new Set(bindings.map(binding => binding.curriculumRevisionId));
  if (ids.size !== bindings.length) ctx.addIssue({ code: 'custom', path: ['curriculumBindings'], message: 'Duplicate curriculum pins' });
  bindings.forEach((binding, index) => {
    if (binding.order !== index + 1) ctx.addIssue({ code: 'custom', path: ['curriculumBindings', index, 'order'], message: 'Bindings must be contiguous and ordered' });
    for (const prerequisite of binding.prerequisiteRevisionIds) {
      if (!ids.has(prerequisite) || !bindings.slice(0, index).some(previous => previous.curriculumRevisionId === prerequisite)) {
        ctx.addIssue({ code: 'custom', path: ['curriculumBindings', index, 'prerequisiteRevisionIds'], message: 'Prerequisite must reference an earlier bound curriculum revision' });
      }
    }
  });
});
export const programVersionSchema = programVersionInputSchema.safeExtend({
  id: uuid, programId: uuid, version: z.number().int().positive(), revision: z.number().int().positive(),
  status: programVersionStatusSchema, source: z.enum(['AUTHORED', 'LEGACY_PIN_BACKFILL']),
  capturedAt: z.iso.datetime(), createdAt: z.iso.datetime(), publishedAt: z.iso.datetime().nullable(), retiredAt: z.iso.datetime().nullable(),
}).strict();
export type ProgramPolicy = z.infer<typeof programPolicySchema>;
export type ProgramVersionInput = z.infer<typeof programVersionInputSchema>;
export type ProgramVersionDto = z.infer<typeof programVersionSchema>;
export type ProgramCurriculumBinding = z.infer<typeof programCurriculumBindingSchema>;
export type ProgramLessonSnapshot = z.infer<typeof programLessonSnapshotSchema>;
export type ProgramEnrollmentStatus = z.infer<typeof programEnrollmentStatusSchema>;
