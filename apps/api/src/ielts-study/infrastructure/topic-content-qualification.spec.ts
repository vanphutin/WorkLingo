import { expect, it } from 'vitest';
import { readAuthoredIeltsTopics } from './topic-content.js';
import { qualifyIeltsTopicPack } from '../domain/ielts-topic-validation.js';

it('qualifies twelve original contextual packs through the actual 90/120/150 planner', async () => {
  const topics = await readAuthoredIeltsTopics();
  expect(topics).toHaveLength(12);
  const allSlugs = new Set<string>();
  for (const topic of topics) {
    for (const skill of ['reading','listening']) expect(new Set(topic.publishedLesson.mission.lessonVersion.activities.filter(a => a.activityType===skill).flatMap(a => 'questions' in a.payload ? a.payload.questions.map(q=>q.answerIndex) : [])).size).toBeGreaterThan(1);
    const result = qualifyIeltsTopicPack(topic.manifest.packs[0]!, topic.publishedLesson);
    expect(result.issues, topic.manifest.title).toEqual([]);
    expect(result.supportedDurations).toEqual([90, 120, 150]);
    for (const chunk of topic.publishedLesson.mission.lessonVersion.wordBanks.flatMap(bank => bank.languageBlocks)) {
      expect(allSlugs.has(chunk.slug)).toBe(false); allSlugs.add(chunk.slug);
    }
    const repeated = structuredClone(topic.publishedLesson);
    repeated.mission.lessonVersion.activities.filter(a => a.learningBlock === 'respond').forEach(a => { a.payload = { ...a.payload, prompt: 'Repeat the same task.' } as typeof a.payload; });
    expect(qualifyIeltsTopicPack(topic.manifest.packs[0]!, repeated).canPublish).toBe(false);
    const uncontextualized = structuredClone(topic.publishedLesson);
    uncontextualized.mission.lessonVersion.contentBlocks.forEach(block => { block.text = 'An isolated list without meaningful situations.'; });
    expect(qualifyIeltsTopicPack(topic.manifest.packs[0]!, uncontextualized).canPublish).toBe(false);
  }
});
