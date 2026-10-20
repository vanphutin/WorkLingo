import { describe, it, expect } from 'vitest';
import { requireTopicSource } from './topic-source.js';
import { topicSource } from './topic-test.fixture.js';

describe('Human approval source completeness', () => {
  it('requires explicit passage evidence for listening rather than normalizer defaults', () => {
    expect(() => requireTopicSource(topicSource.replace('EVIDENCE:\nworkplace-dialogue:1', ''))).toThrow();
  });
  it('rejects exercise content from another passage', () => {
    const other = '[CONTENT unrelated]\ntype: email\ntext:\n<<<\nOther passage.\n>>>\n[/CONTENT]\n';
    expect(() => requireTopicSource(topicSource.replace('[AUDIO_SCRIPT workplace-audio]', other + '[AUDIO_SCRIPT workplace-audio]').replace('content_refs: workplace-dialogue', 'content_refs: unrelated'))).toThrow();
  });
  it('rejects different narration even if source format is valid', () => {
    expect(() => requireTopicSource(topicSource.replace('speaker: customer\nscript:\n<<<\nDear Support Team,', 'speaker: customer\nscript:\n<<<\nAnother passage,'))).toThrow();
  });
});
