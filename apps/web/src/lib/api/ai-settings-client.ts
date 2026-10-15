import { aiSettingsSchema, type AiSettings, type UpdateAiSettings } from '@worklingo/contracts';
import { ApiError } from './api-client';

export class AiSettingsClient {
  constructor(private readonly baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1') {}
  get(admin = false): Promise<AiSettings> { return this.request(admin, { method: 'GET', cache: 'no-store' }); }
  update(admin: boolean, input: UpdateAiSettings, accountId: string | null): Promise<AiSettings> {
    return this.request(admin, { method: 'PATCH', body: JSON.stringify(input), headers: { 'content-type': 'application/json', ...(accountId ? { 'x-worklingo-account-id': accountId } : {}) } });
  }
  private async request(admin: boolean, options: RequestInit): Promise<AiSettings> {
    let response: Response;
    try { response = await fetch(`${this.baseUrl.replace(/\/+$/u, '')}/${admin ? 'admin' : 'me'}/ai-settings`, { ...options, credentials: 'include' }); }
    catch { throw new ApiError({ code: 'NETWORK_ERROR', message: 'Unable to reach AI settings.', status: 0 }); }
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { code?: string } | null;
      throw new ApiError({ code: body?.code ?? 'AI_SETTINGS_ERROR', message: 'AI settings request failed.', status: response.status });
    }
    return aiSettingsSchema.parse(await response.json());
  }
}
export const aiSettingsClient = new AiSettingsClient();
