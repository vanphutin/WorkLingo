import { z } from 'zod';

const slug = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const skill = z.enum(['reading', 'listening', 'speaking', 'writing']);
const uniqueStrings = (values: readonly string[]) => new Set(values).size === values.length;
export const foundationCategorySchema = z.enum(['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing']);
export const objectiveEvidenceSchema = z.object({
  lessonVersionId: z.uuid(),
  activitySlug: slug,
  languageBlockSlugs: z.array(slug).max(50).refine(uniqueStrings, 'Duplicate Language Block reference'),
}).strict();
export const curriculumObjectiveSchema = z.object({
  slug,
  statement: z.string().trim().min(1).max(1000),
  skills: z.array(skill).min(1).max(4).refine(uniqueStrings, 'Duplicate skill'),
  required: z.boolean(),
  evidence: z.array(objectiveEvidenceSchema).min(1).max(50).refine(
    (values) => uniqueStrings(values.map((value) => `${value.lessonVersionId}:${value.activitySlug}`)),
    'Duplicate activity evidence',
  ),
}).strict();
export const curriculumDefinitionInputSchema = z.object({
  category: foundationCategorySchema,
  objectives: z.array(curriculumObjectiveSchema).min(1).max(50).refine(
    (values) => uniqueStrings(values.map((value) => value.slug)), 'Duplicate objective slug',
  ),
  prerequisiteRevisionIds: z.array(z.uuid()).max(50).refine(uniqueStrings, 'Duplicate prerequisite'),
}).strict();
export type CurriculumDefinitionInput = z.infer<typeof curriculumDefinitionInputSchema>;
export type FoundationCategory = z.infer<typeof foundationCategorySchema>;
