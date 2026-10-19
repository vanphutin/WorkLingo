import { z } from 'zod';
import { contentStatusSchema } from './content-authoring.contracts.ts';

const nameSchema = z.string().transform(value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ')).pipe(z.string().min(1).max(120));
const descriptionSchema = z.string().trim().max(2000);
export const learnerTopicGroupSchema = z.object({ id: z.uuid(), name: nameSchema, nameEn: nameSchema.optional(), description: descriptionSchema }).strict();
export type LearnerTopicGroup = z.infer<typeof learnerTopicGroupSchema>;
export const intermediateTopicGroupSchema = learnerTopicGroupSchema.extend({
  nameEn: nameSchema.nullable().optional(), aliases: z.array(nameSchema).max(20).optional(),
  revision: z.number().int().positive(), lessonCount: z.number().int().nonnegative(),
}).strict();
export type IntermediateTopicGroup = z.infer<typeof intermediateTopicGroupSchema>;
export const intermediateTopicGroupCatalogSchema = z.object({
  groups: z.array(intermediateTopicGroupSchema),
  lessons: z.array(z.object({ importId: z.uuid(), title: z.string().min(1), status: contentStatusSchema,
    groupId: z.uuid().nullable(), revision: z.number().int().nonnegative() }).strict()),
}).strict();
export type IntermediateTopicGroupCatalog = z.infer<typeof intermediateTopicGroupCatalogSchema>;
export const createIntermediateTopicGroupSchema = z.object({ name: nameSchema, description: descriptionSchema,
  nameEn: nameSchema.nullable().optional(), aliases: z.array(nameSchema).max(20).optional() }).strict();
export type CreateIntermediateTopicGroup = z.infer<typeof createIntermediateTopicGroupSchema>;
export const updateIntermediateTopicGroupSchema = createIntermediateTopicGroupSchema.extend({ expectedRevision: z.number().int().positive() }).strict();
export type UpdateIntermediateTopicGroup = z.infer<typeof updateIntermediateTopicGroupSchema>;
export const deleteIntermediateTopicGroupSchema = z.object({ expectedRevision: z.number().int().positive() }).strict();
export type DeleteIntermediateTopicGroup = z.infer<typeof deleteIntermediateTopicGroupSchema>;
export const assignIntermediateTopicGroupSchema = z.object({ groupId: z.uuid().nullable(), expectedRevision: z.number().int().nonnegative() }).strict();
export type AssignIntermediateTopicGroup = z.infer<typeof assignIntermediateTopicGroupSchema>;
