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

export const learningProgramCatalogItemSchema = z
  .object({
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
