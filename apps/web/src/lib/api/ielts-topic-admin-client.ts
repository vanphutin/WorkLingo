import { adminIeltsTopicSchema, ieltsContentQualificationResultSchema, publishIeltsTopicResultSchema } from '@worklingo/contracts';
import { ieltsRequest } from './ielts-request';

export const ieltsTopicAdminClient = {
  list: () => ieltsRequest('/admin/ielts-topics', adminIeltsTopicSchema.array()),
  save: (id: string | null, input: { expectedRevision: number | null; idempotencyKey: string; content: unknown }) => ieltsRequest(`/admin/ielts-topics${id ? `/${id}` : ''}`, adminIeltsTopicSchema, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }),
  validate: (id: string, expectedRevision: number) => ieltsRequest(`/admin/ielts-topics/${id}/validate`, ieltsContentQualificationResultSchema, { method: 'POST', body: JSON.stringify({ expectedRevision }) }),
  publish: (id: string, input: { expectedRevision: number; idempotencyKey: string }) => ieltsRequest(`/admin/ielts-topics/${id}/publish`, publishIeltsTopicResultSchema, { method: 'POST', body: JSON.stringify(input) }),
};
