import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/database/prisma.service.js';
import { requestProviderJson } from '../ai-gateway/infrastructure/provider-http-client.js';
import { TopicGenerationService } from './topic-generation.service.js';
import { ProviderError } from '../ai-gateway/domain/provider-errors.js';
import { TopicVocabularyService, type TopicVocabularyCandidate } from './topic-vocabulary.service.js';
vi.mock('../ai-gateway/infrastructure/provider-http-client.js', () => ({ requestProviderJson: vi.fn() }));
const topic = JSON.parse(readFileSync(resolve(__dirname, '../../../../docs/examples/intermediate-topic.json'), 'utf8'));
const id = '00000000-0000-4000-8000-000000000001';
let pool: TopicVocabularyCandidate[] = topic.languageBlocks.map((item: { expression: string }) => ({ sourceEntryId: id, lexicalEntryId: id, senseId: id, expression: item.expression, cefrLevel: 'A2', definition: 'Approved source meaning.', attribution: 'Fixture' }));
const input = { topicGroupId: id, durationMinutes: 90 as const, provider: 'openai' as const, level: 'B1' as const };
let group: { id: string; name: string; nameEn: string; description: string } | null;
async function service(mode = 'live') {
  const module = await Test.createTestingModule({ providers: [TopicGenerationService,
    { provide: TopicVocabularyService, useValue: { select: vi.fn(async () => pool) } },
    { provide: PrismaService, useValue: { intermediateTopicGroup: { findUnique: vi.fn(async () => group) } } },
    { provide: ConfigService, useValue: new ConfigService({ ai: { languageEvaluation: { provider: mode === 'fake' ? 'fake' : 'discovery' },
      topicGenerationMaxOutputTokens: 12000, providerTimeoutMs: 30000, routing: { enabled: mode !== 'disabled', defaultProvider: 'discovery', fallbackEnabled: true,
        openai: { baseUrl: 'https://openai.invalid/v1', apiKey: mode === 'missing' ? undefined : 'test', model: 'selected-openai' },
        discovery: { baseUrl: 'https://discovery.invalid/v1', apiKey: 'test', model: mode === 'qwen' ? 'qwen3.8-27b' : 'selected-discovery' } } } }) },
  ] }).compile();
  return module.get(TopicGenerationService);
}
function reply(value: unknown = topic, provider = 'openai', completed = true) {
  const response = provider === 'openai'
    ? { status: completed ? 'completed' : 'incomplete', output: [{ content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }
    : { choices: [{ finish_reason: completed ? 'stop' : 'length', message: { content: JSON.stringify(value) } }] };
  vi.mocked(requestProviderJson).mockResolvedValue(response);
  return response;
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
    pool = [{ ...pool[0]!, expression: 'he' }];
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
    pool = [{ ...pool[0]!, expression: 'check (something)' }];
    reply({ ...topic, readingText: 'Please check (something) before leaving.', readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }], languageBlocks: [{ ...topic.languageBlocks[0], expression: 'check (something)' }] });
    expect((await (await service()).generate(input)).topic.vocabulary?.entries[0]?.expression).toBe('check (something)');
  });
  it('rejects a medium lesson that ignores every A2 target in the selected pool', async () => {
    pool = [{ ...pool[0]!, cefrLevel: 'A1' }, { ...pool[0]!, expression: 'another target', cefrLevel: 'A2' }];
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
  it('allows a complete lesson request to outlive the old sixty-second provider limit', async () => {
    reply(); await (await service()).generate(input);
    expect(vi.mocked(requestProviderJson).mock.calls[0]![0].timeoutMs).toBeGreaterThan(60000);
    expect(vi.mocked(requestProviderJson).mock.calls[0]![0].timeoutMs).toBeLessThanOrEqual(120000);
  });
  it('constrains structured target expressions to the reviewed library pool', async () => {
    reply(); await (await service()).generate(input);
    const body = JSON.parse(String(vi.mocked(requestProviderJson).mock.calls[0]![0].body));
    expect(body.text.format.schema.properties.languageBlocks.items.properties.expression.enum).toEqual(pool.map((x: TopicVocabularyCandidate) => x.expression));
    const order = Object.keys(body.text.format.schema.properties);
    expect(order.indexOf('languageBlocks')).toBeLessThan(order.indexOf('readingText'));
  });
  it('corrects a completed lesson once when a required target is absent from its passage', async () => {
    const invalid = { ...topic, readingText: 'An unrelated passage.', readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }] };
    const first = reply(invalid);
    const second = reply({ line1: 'They would like to book a table for dinner.' });
    vi.mocked(requestProviderJson).mockReset().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const result = await (await service()).generate(input);
    expect(result.topic.title).toBe(topic.title);
    expect(requestProviderJson).toHaveBeenCalledTimes(2);
    const repair = JSON.parse(String(vi.mocked(requestProviderJson).mock.calls[1]![0].body));
    expect(repair.instructions).toContain('correction');
    expect(repair.instructions).toContain('missingExpressions');
    const supplied = JSON.parse(repair.input.replace(/^<untrusted_topic>|<\/untrusted_topic>$/g, ''));
    expect(supplied.correction.candidate).toEqual(invalid);
    expect(repair.instructions).not.toContain('An unrelated passage.');
    const readingPattern = repair.text.format.schema.properties.line1.pattern;
    expect(readingPattern).toBeTypeOf('string');
    expect(new RegExp(readingPattern).test(topic.readingText)).toBe(true);
    expect(new RegExp(readingPattern).test(invalid.readingText)).toBe(false);
    expect(new RegExp(readingPattern).test(topic.readingText.replace(topic.languageBlocks[0].expression, topic.languageBlocks[0].expression + 's'))).toBe(false);
    expect(vi.mocked(requestProviderJson).mock.calls.every(([r]) => r.url === 'https://openai.invalid/v1/responses')).toBe(true);
  });
  it('repairs only missing target sentences while preserving previous text, targets and evidence', async () => {
    pool = ['check (something)', 'reserve', 'unused target'].map(expression => ({ ...pool[0]!, expression }));
    const blocks = pool.slice(0, 2).map((word, index) => ({ ...topic.languageBlocks[0], slug: 'target-' + index, expression: word.expression }));
    const questions = { readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }] };
    const invalid = { ...topic, ...questions, languageBlocks: blocks, readingText: 'Please check (something) before leaving.' };
    const first = reply(invalid); const second = reply({ line1: 'They decide to reserve a table.' });
    vi.mocked(requestProviderJson).mockReset().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const result = await (await service()).generate(input);
    expect(result.topic.languageBlocks).toEqual(blocks);
    expect(result.topic.readingText).toBe(invalid.readingText + '\nThey decide to reserve a table.');
    expect(result.topic.readingQuestions).toEqual(invalid.readingQuestions);
    const repair = JSON.parse(String(vi.mocked(requestProviderJson).mock.calls[1]![0].body));
    expect(Object.keys(repair.text.format.schema.properties)).toEqual(['line1']);
    const pattern = new RegExp(repair.text.format.schema.properties.line1.pattern);
    expect(pattern.test('They decide to reserve a table.')).toBe(true);
    expect(pattern.test('They reserved a table.')).toBe(false);
  });
  it.each([
    { line1: 'They book a table for dinner.\nExtra line.' },
    { line1: 'They booked tables for dinner.' },
    { line1: 'They book a table for dinner.', unexpected: 'replace other fields' },
  ])('rejects unsafe or incomplete sentence corrections %j', async additions => {
    const invalid = { ...topic, readingText: 'An unrelated passage.', readingQuestions: [{ ...topic.readingQuestions[0], evidenceLine: 1 }], listeningQuestions: [{ ...topic.listeningQuestions[0], evidenceLine: 1 }] };
    const first = reply(invalid); const second = reply(additions);
    vi.mocked(requestProviderJson).mockReset().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 503 });
    expect(requestProviderJson).toHaveBeenCalledTimes(2);
  });
  it('does not start a correction after the shared deadline expires', async () => {
    const svc = await service(); reply({ ...topic, writingModel: '' });
    const clock = vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValue(120001);
    try {
      await expect(svc.generate(input)).rejects.toMatchObject({ status: 504, response: { code: 'TOPIC_GENERATION_TIMEOUT' } });
      expect(requestProviderJson).toHaveBeenCalledTimes(1);
    } finally { clock.mockRestore(); }
  });
  it.each([
    ['PROVIDER_TIMEOUT', 'TOPIC_GENERATION_TIMEOUT', 504],
    ['PROVIDER_AUTH_FAILED', 'TOPIC_GENERATION_AUTH_FAILED', 503],
    ['PROVIDER_RATE_LIMITED', 'TOPIC_GENERATION_RATE_LIMITED', 503],
  ] as const)('reports safe actionable %s without another paid attempt', async (code, expected, status) => {
    vi.mocked(requestProviderJson).mockRejectedValue(new ProviderError('private-secret', { code, retryable: true }));
    await expect((await service()).generate(input)).rejects.toMatchObject({ status, response: { code: expected } });
    expect(requestProviderJson).toHaveBeenCalledTimes(1);
  });
  it('reserves Qwen output tokens for JSON instead of hidden reasoning', async () => {
    reply(topic, 'discovery');await (await service('qwen')).generate({ ...input, provider: 'discovery' });
    const body = JSON.parse(String(vi.mocked(requestProviderJson).mock.calls[0]![0].body));
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
  it('stops after one unsuccessful correction without accepting invalid content', async () => {
    reply({ ...topic, languageBlocks: [{ ...topic.languageBlocks[0], expression: 'not in approved pool' }] });
    await expect((await service()).generate(input)).rejects.toMatchObject({ status: 503 });
    expect(requestProviderJson).toHaveBeenCalledTimes(2);
  });
  it('hides upstream errors and credentials', async () => {
    vi.mocked(requestProviderJson).mockRejectedValue(new Error('private-secret'));
    try { await (await service()).generate(input); expect.fail('must reject'); }
    catch (error) { expect(String(error)).not.toContain('private-secret'); expect(error).toMatchObject({ status: 503 }); }
  });
});
