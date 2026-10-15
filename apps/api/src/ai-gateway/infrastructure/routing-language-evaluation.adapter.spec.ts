import { describe, expect, it } from 'vitest';
import { LanguageEvaluationPort, type LanguageEvaluationInput } from '../domain/language-evaluation.port.js';
import { ProviderError } from '../domain/provider-errors.js';
import { FakeLanguageEvaluationAdapter } from './fake-language-evaluation.adapter.js';
import { RoutingLanguageEvaluationAdapter } from './routing-language-evaluation.adapter.js';

const input: LanguageEvaluationInput = { activityType: 'writing', learnerResponse: 'I will follow up on Friday.', levelCode: 'FOUNDATION_1', prompt: 'Write a follow-up.', requiredPhrases: ['follow up'], rubricId: 'writing', rubricVersion: '1' };
class Provider extends LanguageEvaluationPort {
  calls = 0;
  constructor(private readonly error?: Error) { super(); }
  async evaluate(data: LanguageEvaluationInput) { this.calls++; if (this.error) throw this.error; return new FakeLanguageEvaluationAdapter().evaluate(data); }
}
const upstream = () => new ProviderError('upstream', { code: 'PROVIDER_UPSTREAM', retryable: true });
function router(preferredProvider: 'discovery' | 'openai', fallbackEnabled: boolean, discovery = new Provider(), openai?: Provider) {
  return { discovery, openai, adapter: new RoutingLanguageEvaluationAdapter({
    discovery: { adapter: discovery, model: 'intern-s2' }, ...(openai ? { openai: { adapter: openai, model: 'gpt-test' } } : {}),
  }, { resolve: async () => ({ preferredProvider, fallbackEnabled }) }) };
}
describe('evaluation routing', () => {
  it.each(['discovery', 'openai'] as const)('falls back once from %s and reports actual provider', async (preferred) => {
    const discovery = new Provider(preferred === 'discovery' ? upstream() : undefined);
    const openai = new Provider(preferred === 'openai' ? upstream() : undefined);
    const { adapter } = router(preferred, true, discovery, openai);
    const output = await adapter.evaluateWithProvenance(input);
    expect(output.provenance.providerName).toBe(preferred === 'discovery' ? 'openai-compatible' : 'discovery');
    expect(output.evaluation.scores.clarity).toBeGreaterThanOrEqual(0);
    expect(discovery.calls).toBe(1); expect(openai.calls).toBe(1);
  });
  it('does not call the alternate when account/global fallback is disabled', async () => {
    const { adapter, openai } = router('discovery', false, new Provider(upstream()), new Provider());
    await expect(adapter.evaluate(input)).rejects.toMatchObject({ code: 'PROVIDER_UPSTREAM' });
    expect(openai!.calls).toBe(0);
  });
  it('does not loop when both providers fail', async () => {
    const { adapter, discovery, openai } = router('discovery', true, new Provider(upstream()), new Provider(upstream()));
    await expect(adapter.evaluate(input)).rejects.toMatchObject({ code: 'PROVIDER_UPSTREAM' });
    expect(discovery.calls).toBe(1); expect(openai!.calls).toBe(1);
  });
  it.each([new ProviderError('refused', { code: 'PROVIDER_REFUSED', retryable: false }), new Error('application defect')])('does not bypass refusal or application errors', async (error) => {
    const { adapter, openai } = router('discovery', true, new Provider(error), new Provider());
    await expect(adapter.evaluate(input)).rejects.toBe(error); expect(openai!.calls).toBe(0);
  });
  it('never downgrades an OpenAI-only capability', async () => {
    const { adapter, discovery } = router('discovery', true, new Provider());
    await expect(adapter.evaluate({ ...input, routing: { requiredProvider: 'openai' } })).rejects.toMatchObject({ code: 'PROVIDER_UPSTREAM', retryable: false });
    expect(discovery.calls).toBe(0);
  });
  it('does not downgrade OpenAI-only failures', async () => {
    const { adapter, discovery, openai } = router('discovery', true, new Provider(), new Provider(upstream()));
    await expect(adapter.evaluate({ ...input, routing: { requiredProvider: 'openai' } })).rejects.toMatchObject({ code: 'PROVIDER_UPSTREAM' });
    expect(openai!.calls).toBe(1); expect(discovery.calls).toBe(0);
  });
  it('keeps concurrent account provenance separate', async () => {
    const adapter = new RoutingLanguageEvaluationAdapter({ discovery: { adapter: new Provider(), model: 'intern-s2' }, openai: { adapter: new Provider(), model: 'gpt-test' } }, {
      resolve: async (userId?: string) => ({ preferredProvider: userId === 'a' ? 'discovery' : 'openai', fallbackEnabled: true }),
    });
    const outputs = await Promise.all(['a', 'b'].map(userId => adapter.evaluateWithProvenance({ ...input, routing: { userId } })));
    expect(outputs.map(output => output.provenance.providerModel)).toEqual(['intern-s2', 'gpt-test']);
  });
});
