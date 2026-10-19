import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSettingsService } from '../ai-gateway/application/ai-settings.service.js';
import { requestProviderJson } from '../ai-gateway/infrastructure/provider-http-client.js';
import { TopicJsonRepairService } from './topic-json-repair.service.js';
vi.mock('../ai-gateway/infrastructure/provider-http-client.js', () => ({ requestProviderJson: vi.fn() }));
const source = readFileSync(resolve(__dirname, '../../../../docs/examples/intermediate-topic.json'), 'utf8');
const broken = source.replace('"level": "B1",', '"level": "B1",,');
const settings = { resolve: vi.fn(async () => ({ preferredProvider: 'discovery' })) };
async function service(fake = false) {
  const module = await Test.createTestingModule({ providers: [TopicJsonRepairService,
    { provide: ConfigService, useValue: new ConfigService({ ai: { languageEvaluation: { provider: fake ? 'fake' : 'discovery' },
      routing: { enabled: true, maxOutputTokens: 4096, discovery: { baseUrl: 'https://provider.invalid/v1', apiKey: 'test', model: 'repair-model' } }, providerTimeoutMs: 1000 } }) },
    { provide: AiSettingsService, useValue: settings },
  ] }).compile();
  return module.get(TopicJsonRepairService);
}
function reply(edits: { search: string; replacement: string }[], status = 'repaired') {
  vi.mocked(requestProviderJson).mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ status, edits, explanation: 'Formatting only.' }) } }] });
}
beforeEach(() => vi.clearAllMocks());
describe('AI topic JSON repair is a proposal, never content generation', () => {
  it('uses the configured provider once and returns a verified punctuation-only candidate', async () => {
    reply([{ search: '"level": "B1",,', replacement: '"level": "B1",' }]);
    expect(await (await service()).repair(broken, 'admin')).toEqual({ source, explanation: 'Formatting only.', provider: 'discovery', model: 'repair-model' });
    expect(requestProviderJson).toHaveBeenCalledTimes(1);
    expect(settings.resolve).toHaveBeenCalledWith('admin');
  });
  it('refuses a changed answer instead of trusting the AI explanation', async () => {
    reply([{ search: broken, replacement: source.replace('"answerIndex": 0', '"answerIndex": 1') }]);
    await expect((await service()).repair(broken, 'admin')).rejects.toMatchObject({ status: 422, response: { code: 'TOPIC_JSON_REPAIR_UNSAFE' } });
  });
  it('can flatten model paragraphs without adding or changing words', async () => {
    const json = JSON.parse(source);
    json.writingModel = 'Dear guest,\n\nYour booking is confirmed.';
    const input = JSON.stringify(json);
    reply([{ search: JSON.stringify(json.writingModel), replacement: '"Dear guest, Your booking is confirmed."' }]);
    const result = await (await service()).repair(input, 'admin');
    expect(JSON.parse(result.source).writingModel).toBe('Dear guest, Your booking is confirmed.');
  });
  it('stops on refusal and never retries', async () => {
    reply([], 'cannot_repair');
    await expect((await service()).repair(broken, 'admin')).rejects.toMatchObject({ status: 422 });
    expect(requestProviderJson).toHaveBeenCalledTimes(1);
  });
  it('rejects missing data before calling AI and never invents a repair in fake mode', async () => {
    await expect((await service()).repair('{"title":"unfinished', 'admin')).rejects.toMatchObject({ status: 422 });
    await expect((await service(true)).repair(broken, 'admin')).rejects.toMatchObject({ status: 503 });
    expect(requestProviderJson).not.toHaveBeenCalled();
  });
  it('hides upstream response data on failure', async () => {
    vi.mocked(requestProviderJson).mockRejectedValue(new Error('upstream-private-secret'));
    await expect((await service()).repair(broken, 'admin')).rejects.toMatchObject({ status: 503, response: { code: 'TOPIC_JSON_REPAIR_UNAVAILABLE' } });
  });
});
