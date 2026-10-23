import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { requestProviderJson } from '../ai-gateway/infrastructure/provider-http-client.js';
import { TopicGenerationService } from './topic-generation.service.js';
import { TopicVocabularyService, type TopicVocabularyCandidate } from './topic-vocabulary.service.js';
vi.mock('../ai-gateway/infrastructure/provider-http-client.js', () => ({ requestProviderJson: vi.fn() }));
const topic = JSON.parse(readFileSync(resolve(__dirname, '../../../../docs/examples/intermediate-topic.json'), 'utf8'));
const id = '00000000-0000-4000-8000-000000000001';
let pool = topic.languageBlocks.map((item: { expression: string }) => ({ sourceEntryId: id, lexicalEntryId: id, senseId: id, expression: item.expression, cefrLevel: 'A2', definition: 'Approved source meaning.', attribution: 'Fixture' }));
const input = { topicGroupId: id, durationMinutes: 90 as const, provider: 'openai' as const, level: 'B1' as const };
let group: { id: string; name: string; nameEn: string; description: string } | null;
async function service(mode = 'live') {
  const module = await Test.createTestingModule({ providers: [TopicGenerationService,
    { provide: TopicVocabularyService, useValue: { select: vi.fn(async () => pool) } },
    { provide: PrismaService, useValue: { intermediateTopicGroup: { findUnique: vi.fn(async () => group) } } },
    { provide: ConfigService, useValue: new ConfigService({ ai: { languageEvaluation: { provider: mode === 'fake' ? 'fake' : 'discovery' },
      topicGenerationMaxOutputTokens: 12000, providerTimeoutMs: 30000, routing: { enabled: mode !== 'disabled', defaultProvider: 'discovery', fallbackEnabled: true,
        openai: { baseUrl: 'https://openai.invalid/v1', apiKey: mode === 'missing' ? undefined : 'test', model: 'selected-openai' },
        discovery: { baseUrl: 'https://discovery.invalid/v1', apiKey: 'test', model: 'selected-discovery' } } } }) },
  ] }).compile();
  return module.get(TopicGenerationService);
}
function reply(value: unknown = topic, provider = 'openai', completed = true) {
  vi.mocked(requestProviderJson).mockResolvedValue(provider === 'openai'
    ? { status: completed ? 'completed' : 'incomplete', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }
    : { choices: [{ finish_reason: completed ? 'stop' : 'length', message: { content: JSON.stringify(value) } }] });
}
beforeEach(() => { vi.clearAllMocks(); pool = topic.languageBlocks.map((item: { expression: string }) => ({ sourceEntryId: id, lexicalEntryId: id, senseId: id, expression: item.expression, cefrLevel: 'A2', definition: 'Approved source meaning.', attribution: 'Fixture' })); group = { id, name: 'Đặt bàn', nameEn: 'Restaurant reservations', description: 'Booking a table.' }; });
describe('Admin-selected AI creates a validated editable topic without saving', () => {
  it.each(['openai', 'discovery'] as const)('honors explicit %s despite a different account/system default', async provider => {
    reply(topic, provider);
    const result = await (await service()).generate({ ...input, provider });
    expect(result.topic.title).toBe(topic.title);
    expect(result.topicGroupId).toBe(id);
    expect(result.plan).toEqual({ durationMinutes: 90, allocations: [{ type: 'activate', targetMinutes: 10 }, { type: 'readDecode', targetMinutes: 30 }, { type: 'listenReason', targetMinutes: 20 }, { type: 'respond', targetMinutes: 30 }] });
    expect(result.provider).toBe(provider);
    const call = vi.mocked(requestProviderJson).mock.calls[0]![0];
    expect(call.url).toBe(provider === 'openai' ? 'https://openai.invalid/v1/responses' : 'https://discovery.invalid/v1/chat/completions');
    const payload = JSON.parse(String(call.body));
    expect(payload.model).toBe(`selected-${provider}`);
    expect(call.body).toContain('Restaurant reservations');
    expect(call.body).toContain('durationMinutes');
    expect(requestProviderJson).toHaveBeenCalledTimes(1);
  });
  it('does not count a target substring inside another word as vocabulary usage', async () => {
    pool = [{ ...pool[0], expression: 'he' }];
    reply({ ...topic, readingText: 'The customer waits.', readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }], languageBlocks: [{ ...topic.languageBlocks[0], expression: 'he' }] });
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 503 });
  });
  it('preserves a multiline publisher attribution in the generated JSON', async () => {
    pool = pool.map((item: TopicVocabularyCandidate) => ({ ...item, attribution: 'Publisher notice\nLicense terms' }));
    reply();
    const result = await (await service()).generate(input);
    expect(result.topic.vocabulary?.entries[0]?.attribution).toBe('Publisher notice\nLicense terms');
  });
  it('accepts literal punctuation in a target expression when it appears in the passage', async () => {
    pool = [{ ...pool[0], expression: 'check (something)' }];
    reply({ ...topic, readingText: 'Please check (something) before leaving.', readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }], languageBlocks: [{ ...topic.languageBlocks[0], expression: 'check (something)' }] });
    expect((await (await service()).generate(input)).topic.vocabulary?.entries[0]?.expression).toBe('check (something)');
  });
  it('rejects a medium lesson that ignores every A2 target in the selected pool', async () => {
    pool = [{ ...pool[0], cefrLevel: 'A1' }, { ...pool[0], expression: 'another target', cefrLevel: 'A2' }];
    reply();
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 503 });
  });
  it.each(['fake', 'missing', 'disabled'])('never fabricates or silently switches providers in %s mode', async mode => {
    await expect((await service(mode)).generate(input)).rejects.toMatchObject({ status: 422 });
    expect(requestProviderJson).not.toHaveBeenCalled();
  });
  it('rejects a missing topic before using a paid provider', async () => {
    group = null;
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 404 });
    expect(requestProviderJson).not.toHaveBeenCalled();
  });
  it.each([
    { readingQuestions: [{ ...topic.readingQuestions[0], answerIndex: 100 }] },
    { readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 9999 }] },
    { languageBlocks: [{ ...topic.languageBlocks[0], grammarPattern: '' }] },
    { languageBlocks: [{ ...topic.languageBlocks[0], commonError: '   ' }] },
    { languageBlocks: [{ ...topic.languageBlocks[0], collocations: [] }] },
    { languageBlocks: [{ ...topic.languageBlocks[0], collocations: ['   '] }] },
    { languageBlocks: [{ ...topic.languageBlocks[0], expression: 'invented target outside the library' }] },
    { writingModel: '' }, { level: 'C1' }, { speechReview: 'a'.repeat(64) }, { unexpected: 'payload' },
  ])('rejects invalid generated lessons %j', async patch => {
    reply({ ...topic, ...patch });
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 503, response: { code: 'TOPIC_GENERATION_UNAVAILABLE' } });
  });
  it.each(['openai', 'discovery'])('rejects truncated %s output without a retry or fallback', async provider => {
    reply(topic, provider, false);
    await expect((await service()).generate({ ...input, provider: provider as 'openai' | 'discovery' })).rejects.toMatchObject({ status: 503 });
    expect(requestProviderJson).toHaveBeenCalledTimes(1);
  });
  it('hides upstream errors and credentials', async () => {
    vi.mocked(requestProviderJson).mockRejectedValue(new Error('private-secret'));
    try { await (await service()).generate(input); expect.fail('must reject'); }
    catch (error) { expect(String(error)).not.toContain('private-secret'); expect(error).toMatchObject({ status: 503 }); }
  });
});
