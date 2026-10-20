import { z } from 'zod';
import { intermediateTopicGroupCatalogSchema, intermediateTopicGroupSchema, createIntermediateTopicGroupSchema,
  updateIntermediateTopicGroupSchema, deleteIntermediateTopicGroupSchema, assignIntermediateTopicGroupSchema,
  type CreateIntermediateTopicGroup, type UpdateIntermediateTopicGroup, type DeleteIntermediateTopicGroup, type AssignIntermediateTopicGroup } from '@worklingo/contracts';
import { ApiError } from './api-client';

const path = '/admin/intermediate-topic-groups';
class TopicGroupClient {
  catalog() { return this.request(path, 'GET', undefined, intermediateTopicGroupCatalogSchema); }
  create(input: CreateIntermediateTopicGroup) { return this.request(path, 'POST', createIntermediateTopicGroupSchema.parse(input), intermediateTopicGroupSchema); }
  update(id: string, input: UpdateIntermediateTopicGroup) {
    return this.request(`${path}/${encodeURIComponent(id)}`, 'PATCH', updateIntermediateTopicGroupSchema.parse(input), intermediateTopicGroupSchema);
  }
  async remove(id: string, input: DeleteIntermediateTopicGroup): Promise<void> {
    await this.request(`${path}/${encodeURIComponent(id)}`, 'DELETE', deleteIntermediateTopicGroupSchema.parse(input), z.unknown());
  }
  assign(id: string, input: AssignIntermediateTopicGroup) {
    return this.request(`${path}/lessons/${encodeURIComponent(id)}`, 'PUT', assignIntermediateTopicGroupSchema.parse(input), intermediateTopicGroupCatalogSchema);
  }
  private async request<T>(route: string, method: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
      response = await fetch(`${base}${route}`, { method, credentials: 'include',
        ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
    } catch { throw new ApiError({ code: 'NETWORK_ERROR', message: 'Topic categories could not be reached.', status: 0 }); }
    if (!response.ok) {
      const error = z.object({ code: z.string().optional() }).safeParse(await response.json().catch(() => null));
      throw new ApiError({ code: error.success ? error.data.code ?? 'API_ERROR' : 'API_ERROR', message: 'Topic categories could not be updated.', status: response.status });
    }
    return schema.parse(response.status === 204 ? undefined : await response.json());
  }
}
export const topicGroupClient = new TopicGroupClient();
