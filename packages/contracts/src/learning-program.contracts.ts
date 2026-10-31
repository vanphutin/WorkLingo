import { z } from 'zod';

export const learningProgramAvailabilityStatusSchema = z.enum([
  'AVAILABLE',
  'BETA',
  'COMING_SOON',
  'IN_DEVELOPMENT',
  'DISABLED',
]);
export type LearningProgramAvailabilityStatusDto = z.infer<
  typeof learningProgramAvailabilityStatusSchema
>;

export const learningProgramIconKeySchema = z.enum([
  'beginner',
  'intermediate',
  'toeic',
  'ielts',
]);
export type LearningProgramIconKeyDto = z.infer<typeof learningProgramIconKeySchema>;

/** Safe presentation projection: never includes assessment answers, rubrics or activity payloads. */
export const programReleaseDisplaySchema = z.object({
  id:z.uuid(),version:z.number().int().positive(),source:z.enum(['AUTHORED','LEGACY_PIN_BACKFILL']),status:z.enum(['DRAFT','IN_REVIEW','APPROVED','PUBLISHED','RETIRED']),
  title:z.string(),description:z.string().optional(),objectives:z.array(z.string()).optional(),difficulty:z.string().optional(),estimatedMinutes:z.number().nonnegative().optional(),supportedLanguages:z.array(z.string()).optional(),audiences:z.array(z.string()).optional(),
}).strict();
export const programEnrollmentDisplaySchema=z.object({programSlug:z.string(),programName:z.string(),release:programReleaseDisplaySchema.nullable()}).strict();

export const learningProgramCatalogItemSchema = z
  .object({
    id: z.uuid().optional(),
    currentRelease: programReleaseDisplaySchema.nullable().optional(),
    availabilityStatus: learningProgramAvailabilityStatusSchema,
    description: z.string().min(1),
    destination: z.enum(['/dashboard', '/ielts']).nullable(),
    iconKey: learningProgramIconKeySchema,
    isSelectable: z.boolean(),
    learningGoal: z.string().min(1),
    name: z.string().min(1),
    proficiencyLabel: z.string().min(1),
    publishedLevelCount: z.number().int().nonnegative(),
    publishedPathCount: z.number().int().nonnegative(),
    slug: z.string().min(1),
  })
  .strict();
export type LearningProgramCatalogItemDto = z.infer<
  typeof learningProgramCatalogItemSchema
>;

export const learningProgramCatalogSchema = z
  .object({ programs: z.array(learningProgramCatalogItemSchema) })
  .strict();
export type LearningProgramCatalogDto = z.infer<typeof learningProgramCatalogSchema>;
