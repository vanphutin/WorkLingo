import { z } from 'zod';

export const programContextSchema = z.object({
  activeProgram: z.object({ id: z.string().uuid(), slug: z.string().min(1), name: z.string().min(1) }).strict().nullable(),
  enrollment: z.object({
    id: z.string().uuid(), revision: z.number().int().positive(),
    currentLevel: z.object({ id: z.string().uuid(), code: z.string().min(1), name: z.string().min(1) }).strict().nullable(),
  }).strict().nullable(),
}).strict().refine((value) => (value.activeProgram === null) === (value.enrollment === null), {
  message: 'Program and enrollment must both be assigned or both be null',
});

export type ProgramContextDto = z.infer<typeof programContextSchema>;

export const activateProgramSchema = z.object({
  programSlug: z.string().trim().min(1).max(100),
  expectedRevision: z.number().int().positive().nullable(),
}).strict();
export type ActivateProgramInput = z.infer<typeof activateProgramSchema>;
