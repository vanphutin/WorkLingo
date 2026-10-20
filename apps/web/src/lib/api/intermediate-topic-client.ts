import { z } from 'zod';
import { approveTopicSchema, createTopicSessionSchema, learnerTopicSchema, topicReviewRequestSchema, topicReviewSchema, type ApproveTopic, type CreateTopicSession, type TopicReviewRequest } from '@worklingo/contracts';
import { ApiError, learningSessionDtoSchema } from './api-client';
import { repairTopicJsonRequestSchema, topicJsonRepairProposalSchema, type RepairTopicJsonRequest } from '@worklingo/contracts';

class IntermediateTopicClient {
  repairJson(input: RepairTopicJsonRequest) { return this.request('/admin/intermediate-topics/repair-json', 'POST', repairTopicJsonRequestSchema.parse(input), topicJsonRepairProposalSchema); }
  review(id: string) { return this.request(`/admin/intermediate-topics/${encodeURIComponent(id)}/review`, 'GET', undefined, topicReviewSchema); }
  propose(id: string, input: TopicReviewRequest) { return this.request(`/admin/intermediate-topics/${encodeURIComponent(id)}/propose`, 'POST', topicReviewRequestSchema.parse(input), topicReviewSchema); }
  approve(id: string, input: ApproveTopic) { return this.request(`/admin/intermediate-topics/${encodeURIComponent(id)}/approve`, 'POST', approveTopicSchema.parse(input), topicReviewSchema); }
  list() { return this.request('/intermediate-topics', 'GET', undefined, z.array(learnerTopicSchema)); }
  create(input: CreateTopicSession) { return this.request('/intermediate-topics/sessions', 'POST', createTopicSessionSchema.parse(input), learningSessionDtoSchema); }
  private async request<T>(path: string, method: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
      response = await fetch(`${base}${path}`, { method, credentials: 'include', ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
    } catch { throw new ApiError({ code: 'NETWORK_ERROR', message: 'The request could not be completed.', status: 0 }); }
    if (!response.ok) {
      const error = z.object({ code: z.string().optional() }).safeParse(await response.json().catch(() => null));
      throw new ApiError({ code: error.success ? error.data.code ?? 'API_ERROR' : 'API_ERROR', message: 'The topic request could not be completed.', status: response.status });
    }
    return schema.parse(await response.json());
  }
}
export const intermediateTopicClient = new IntermediateTopicClient();
