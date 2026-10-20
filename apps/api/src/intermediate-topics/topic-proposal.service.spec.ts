import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../common/config/app-config.schema.js';
import type { AiSettingsService } from '../ai-gateway/application/ai-settings.service.js';
import { requestProviderJson } from '../ai-gateway/infrastructure/provider-http-client.js';
import { TopicProposalService } from './topic-proposal.service.js';
vi.mock('../ai-gateway/infrastructure/provider-http-client.js', () => ({ requestProviderJson: vi.fn() }));
describe('Topic duration adapter', () => {
  const settings = { resolve: vi.fn(async () => ({ preferredProvider: 'discovery', fallbackEnabled: false })) };
  function service(fake: boolean) {
    return new TopicProposalService(new ConfigService({ ai: { languageEvaluation: { provider: fake ? 'fake' : 'discovery' },
      routing: { enabled: true, maxOutputTokens: 2000, discovery: { baseUrl: 'https://provider.invalid/v1', apiKey: 'test', model: 'duration-model' } }, providerTimeoutMs: 1000 } }) as unknown as ConfigService<AppConfig, true>, settings as unknown as AiSettingsService);
  }
  it('labels fake suggestions as simulation without HTTP', async () => {
    vi.mocked(requestProviderJson).mockClear();
    expect(await service(true).propose('source', 'admin')).toMatchObject({ simulation: true, provider: 'fake' });
    expect(requestProviderJson).not.toHaveBeenCalled();
  });
  it('uses configured routing and rejects AI approval fields without leaking upstream output', async () => {
    vi.mocked(requestProviderJson).mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ approval: 'grant', secret: 'upstream-private' }) } }] });
    await expect(service(false).propose('source', 'admin')).rejects.toMatchObject({ status: 503, response: { code: 'TOPIC_PROPOSAL_UNAVAILABLE' } });
    expect(settings.resolve).toHaveBeenCalledWith('admin');
    const request = vi.mocked(requestProviderJson).mock.calls.at(-1)![0];
    expect(request.url).toBe('https://provider.invalid/v1/chat/completions');
    expect(JSON.parse(request.body as string).model).toBe('duration-model');
  });
});
