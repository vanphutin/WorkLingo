import { ieltsIntroductionSchema, ieltsIntroductionVisitSchema } from '@worklingo/contracts';
import { ieltsRequest } from './ielts-request';

export const ieltsIntroductionClient = {
  get(versionId?: string) { return ieltsRequest(`/me/ielts-introduction${versionId ? `?versionId=${encodeURIComponent(versionId)}` : ''}`, ieltsIntroductionSchema); },
  visit(input: { orientationVersionId: string; slideIndex: number; expectedRevision: number }) { return ieltsRequest('/me/ielts-introduction/visit', ieltsIntroductionVisitSchema, { method: 'PUT', body: JSON.stringify(input) }); },
};
