import { z } from 'zod';

export const adminAuditFilterSchema = z.object({
  action: z.string().trim().optional(),
  actorId: z.string().uuid().optional(),
  cursor: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  resourceId: z.string().trim().optional(),
  resourceType: z.string().trim().optional(),
  to: z.string().datetime().optional(),
});
export type AdminAuditFilterInput = z.infer<typeof adminAuditFilterSchema>;

export const adminAuditEventSchema = z.object({
  action: z.string(),
  actorDisplayName: z.string(),
  actorId: z.string().uuid(),
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  newState: z.record(z.string(), z.unknown()).nullable(),
  oldState: z.record(z.string(), z.unknown()).nullable(),
  resourceId: z.string(),
  resourceType: z.string(),
});
export type AdminAuditEventDto = z.infer<typeof adminAuditEventSchema>;

export const adminAuditPageSchema = z.object({
  items: z.array(adminAuditEventSchema),
  nextCursor: z.string().nullable(),
});
export type AdminAuditPageDto = z.infer<typeof adminAuditPageSchema>;
