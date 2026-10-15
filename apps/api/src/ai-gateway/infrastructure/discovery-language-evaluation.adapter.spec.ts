import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeLanguageEvaluationAdapter } from './fake-language-evaluation.adapter.js';
import { DiscoveryLanguageEvaluationAdapter } from './discovery-language-evaluation.adapter.js';

const input = { activityType: 'writing' as const, learnerResponse: 'I will follow up on Friday.', levelCode: 'FOUNDATION_1', prompt: 'Write a follow-up.', requiredPhrases: ['follow up'], rubricId: 'writing', rubricVersion: '1' };
const config = { apiKey: 'synthetic-test-secret', baseUrl: 'https://discovery.example.test/v1/', model: 'intern-s2', timeoutMs: 1000, maxOutputTokens: 2048 };
afterEach(() => vi.unstubAllGlobals());

describe('Discovery language evaluation', () => {
  it('uses bounded Chat Completions and validates the real evaluation contract', async () => {
    const evaluation = await new FakeLanguageEvaluationAdapter().evaluate(input);
    vi.stubGlobal('fetch', async (url: string, request: RequestInit) => {
      expect(url).toBe('https://discovery.example.test/v1/chat/completions');
      const body = JSON.parse(request.body as string);
      expect(body).toMatchObject({ model: 'intern-s2', max_tokens: 2048, stream: false });
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].content).toContain('worklingo_untrusted_data');
      expect(body.messages[1].content).not.toContain('synthetic-test-secret');
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(evaluation) } }] });
    });
    await expect(new DiscoveryLanguageEvaluationAdapter(config).evaluate(input)).resolves.toEqual(evaluation);
  });
  it.each([
    { choices: [{ finish_reason: 'length', message: { content: '{}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'not json' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: '{"scores":{"clarity":2},"feedback":{}}' } }] },
    { choices: [] },
  ])('rejects invalid or incomplete output instead of producing scores', async (response) => {
    vi.stubGlobal('fetch', async () => Response.json(response));
    await expect(new DiscoveryLanguageEvaluationAdapter(config).evaluate(input)).rejects.toMatchObject({ code: 'PROVIDER_RESPONSE_INVALID' });
  });
  it('preserves refusals as non-retryable failures', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ choices: [{ finish_reason: 'content_filter', message: { content: null, refusal: 'refused' } }] }));
    await expect(new DiscoveryLanguageEvaluationAdapter(config).evaluate(input)).rejects.toMatchObject({ code: 'PROVIDER_REFUSED', retryable: false });
  });
  it('detects explicit refusal even when the provider omits content', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ choices: [{ finish_reason: 'content_filter', message: { refusal: 'refused' } }] }));
    await expect(new DiscoveryLanguageEvaluationAdapter(config).evaluate(input)).rejects.toMatchObject({ code: 'PROVIDER_REFUSED', retryable: false });
  });
});
