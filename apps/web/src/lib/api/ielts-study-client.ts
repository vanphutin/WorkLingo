import { ieltsStudyProgressSchema, ieltsTopicCatalogSchema, startIeltsTopicSessionSchema, type StartIeltsTopicSessionInput } from '@worklingo/contracts';
import { learningSessionDtoSchema } from './api-client';
import { ieltsRequest } from './ielts-request';

export const ieltsStudyClient = {
  catalog: () => ieltsRequest('/me/ielts-study/topics', ieltsTopicCatalogSchema),
  progress: () => ieltsRequest('/me/ielts-study/progress', ieltsStudyProgressSchema),
  async start(input: StartIeltsTopicSessionInput) {
    return ieltsRequest('/me/ielts-study/sessions', learningSessionDtoSchema, { method: 'POST', body: JSON.stringify(startIeltsTopicSessionSchema.parse(input)) });
  },
};
