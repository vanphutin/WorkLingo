import { describe, expect, it } from 'vitest';
import { createTopicJsonTemplate, topicJsonToDraft } from './topic-json';
import { topicJsonDiagnostics } from './topic-json-diagnostics';

describe('Actionable topic JSON diagnostics', () => {
  it('locates an incomplete JSON document at its last line and column', () => {
    const source = '{\n  "title": "Restaurant",\n  "e';
    try { JSON.parse(source); expect.fail('Expected syntax failure'); }
    catch (error) {
      expect(topicJsonDiagnostics(error, source)[0]).toMatchObject({ path: '$', line: 3, column: expect.any(Number), offset: expect.any(Number) });
    }
  });
  it('shows the indexed question field for an invalid answer', () => {
    const json = createTopicJsonTemplate();
    json.readingQuestions[0]!.answerIndex = 7;
    try { topicJsonToDraft(json); expect.fail('Expected invalid answer'); }
    catch (error) { expect(topicJsonDiagnostics(error, JSON.stringify(json))[0]?.path).toBe('readingQuestions[0].answerIndex'); }
  });
});
