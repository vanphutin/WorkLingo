import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { constrainedChatRequest, strictChatEvaluation } from './language-evaluation-chat-contract.js';
import { languageEvaluationJsonSchema } from './openai-language-evaluation.adapter.js';
import { localRequest } from '../../../test/beginner-pilot/bcd-local-calibration.js';
import type { Receipt } from '../../../test/beginner-pilot/bcd-local-calibration.js';
const root = resolve(__dirname, '../../../../..');
const historical = JSON.parse(readFileSync(resolve(root, 'docs/qualification/beginner-r12b-local-calibration.json'), 'utf8')) as { receipts: Receipt[] };
const oracle = JSON.parse(readFileSync(resolve(root, 'docs/qualification/beginner-r12b-oracle-adjudication-final.json'), 'utf8'));
describe('constrained local Chat contract', () => {
  it('requests the complete schema in the nested shape read by pinned llama b12000', () => {
    const original = localRequest(oracle.decisions[0]);
    const constrained = constrainedChatRequest(original);
    expect(constrained.response_format).toEqual({ type: 'json_schema', json_schema: { name: 'worklingo_language_evaluation', strict: true, schema: languageEvaluationJsonSchema } });
    expect(constrained.messages).toEqual(original.messages);
    expect(constrained.max_tokens).toBe(2048);
    expect(constrained.stream).toBe(false);
  });
  it.each(historical.receipts)('keeps retained original $observationId rejected', (receipt) => {
    expect(() => strictChatEvaluation(receipt.raw)).toThrow();
  });
  const good = { scores: { taskCompletion: 1, meaningAndLogic: 1, targetLanguage: 1, clarity: 1 }, feedback: { summary: 'Tốt', strengths: [], improvements: [], correctedExample: null } };
  const wrap = (content: string, finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content } }] });
  it('accepts only complete schema-valid JSON without altering scores', () => expect(strictChatEvaluation(wrap(JSON.stringify(good)))).toEqual(good));
  it.each([
    wrap('```json\n' + JSON.stringify(good) + '\n```'), wrap('Explanation ' + JSON.stringify(good)), wrap('{'),
    wrap(JSON.stringify(good), 'length'), wrap(JSON.stringify({ ...good, extra: true })),
    wrap(JSON.stringify({ ...good, scores: { ...good.scores, clarity: 2 } })),
    wrap(JSON.stringify({ ...good, feedback: { ...good.feedback, hiddenExtra: 'forbidden' } })),
    { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(good), refusal: 'refused' } }] },
    { choices: [{ finish_reason: 'content_filter', message: { content: null } }] },
    { choices: [] }, { choices: [{ delta: { content: JSON.stringify(good) } }] },
  ])('rejects malformed, fenced, streaming, refused and truncated response %#', raw => expect(() => strictChatEvaluation(raw)).toThrow());
  it('preserves all128 case semantic requests including alternatives, wrong roles and injection', () => {
    for (const decision of oracle.decisions) {
      const original = localRequest(decision), constrained = constrainedChatRequest(original);
      expect(constrained.messages).toEqual(original.messages);
      expect(constrained.cache_prompt).toBe(false);
    }
  });
  it('does not mutate a legacy message payload', () => {
    const original = { messages: [{ role: 'user', content: 'legacy raw <>&' }], stream: false, max_tokens: 2048 };
    expect(constrainedChatRequest(original).messages).toEqual(original.messages);
    expect(Object.keys(original)).toEqual(['messages', 'stream', 'max_tokens']);
  });
  it('preserves explicit refusal classification even when content is omitted', () => {
    try { strictChatEvaluation({ choices: [{ finish_reason: 'content_filter', message: { refusal: 'refused' } }] }); throw new Error('EXPECTED_REFUSAL'); }
    catch (error) { expect(error).toMatchObject({ code: 'PROVIDER_REFUSED', retryable: false }); }
  });
});
