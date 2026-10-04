import { z } from 'zod';

export const registerInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
});

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const authUserSchema = z.object({
  displayName: z.string(),
  email: z.string().email(),
  id: z.string().uuid(),
  roles: z.array(z.enum(['LEARNER', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'])),
});

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
