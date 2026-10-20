import { z } from 'zod';
import { ieltsRequest } from './ielts-request';

export type AdminContentKind = 'topic' | 'bridge' | 'mock' | 'lesson';
export type RemoveAdminContentInput = { expectedRevision: number; idempotencyKey: string; expectedAction: 'deleted' | 'archived' };
const removalSchema = z.object({ id: z.string(), action: z.enum(['deleted', 'archived']) }).strict();

export const adminContentLifecycleClient = {
  remove: (kind: AdminContentKind, id: string, input: RemoveAdminContentInput) => ieltsRequest(
    `/admin/content-lifecycle/${kind}/${encodeURIComponent(id)}/remove`,
    removalSchema,
    { method: 'POST', body: JSON.stringify(input) },
  ),
};
