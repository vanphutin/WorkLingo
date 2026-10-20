import type { IeltsTopicPack } from '@worklingo/content-format';
import type { IeltsContentQualificationResult, IeltsStudyDuration } from '@worklingo/contracts';
import type { PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { planFoundationSession } from '../../learning-sessions/domain/session-planner.js';

export function qualifyIeltsTopicPack(pack: IeltsTopicPack, publishedLesson: { mission: PublishedMission; programSlug: string; evidenceSources?: Record<string, string> }): IeltsContentQualificationResult {
  const issues: IeltsContentQualificationResult['issues'] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const mission = publishedLesson.mission;
  const lesson = mission.lessonVersion;
  if (publishedLesson.programSlug !== 'ielts' || mission.purpose !== 'learning') issue('IELTS_TOPIC_WRONG_PROGRAM', 'curriculumRevisionId', 'The pack must use a learning mission owned by IELTS.');
  if (!mission.slug.startsWith('ielts-') || lesson.wordBanks.some(bank => !bank.slug.startsWith('ielts-') || bank.languageBlocks.some(chunk => !chunk.slug.startsWith('ielts-')))) issue('IELTS_TOPIC_NAMESPACE', 'wordBanks', 'Use independent IELTS word banks and chunks.');
  const chunks = lesson.wordBanks.flatMap(bank => bank.languageBlocks);
  const selected = chunks.filter(chunk => pack.focusChunkSlugs.includes(chunk.slug));
  if (new Set(pack.focusChunkSlugs).size < 12 || selected.length !== pack.focusChunkSlugs.length) issue('IELTS_TOPIC_CHUNKS', 'focusChunkSlugs', 'At least twelve distinct chunks must exist in the bound lesson.');
  const contexts = pack.contexts.map(context => lesson.contentBlocks.find(block => block.slug === context.slug));
  if (contexts.length < 2 || contexts.some(context => !context) || new Set(contexts.map(context => context?.text.trim())).size < 2) issue('IELTS_TOPIC_CONTEXTS', 'contexts', 'Bind two distinct authored situations from the lesson.');
  for (const chunk of selected) {
    if (!chunk.meaning.trim() || !chunk.pronunciation.trim() || !chunk.collocations.length || !chunk.examples.length || !chunk.commonErrors.length) issue('IELTS_TOPIC_CHUNK_DETAILS', chunk.slug, 'A chunk needs meaning, pronunciation, collocations, example and common error.');
    if (!contexts.every(context => context?.text.toLowerCase().includes(chunk.canonicalForm.toLowerCase()))) issue('IELTS_TOPIC_CHUNK_CONTEXT', chunk.slug, 'Each focus chunk must be used in both authored situations.');
    if (!lesson.activities.some(activity => activity.languageBlockReferences.includes(chunk.slug))) issue('IELTS_TOPIC_UNUSED_CHUNK', chunk.slug, 'Every focus chunk needs actual practice.');
  }
  const types = new Set(lesson.activities.map(activity => activity.activityType));
  if (!types.has('reading') || !types.has('listening') || !types.has('writing') || !types.has('speaking')) issue('IELTS_TOPIC_SKILLS', 'activities', 'Author reading, listening, speaking and writing.');
  const productive = lesson.activities.filter(activity => activity.activityType === 'speaking' || activity.activityType === 'writing');
  if (new Set(productive.map(activity => activity.payload.prompt.trim().toLowerCase())).size !== productive.length) issue('IELTS_TOPIC_REPEATED_TASK', 'activities', 'Productive tasks must have distinct purposes and prompts.');
  for (const context of contexts) if (context && context.text.split(/\s+/u).length < 80) issue('IELTS_TOPIC_CONTEXT_DEPTH', context.slug, 'Author a coherent situation of at least eighty words, not an isolated word list.');
  for (const activity of lesson.activities) {
    const sources = activity.contentReferences.map(ref => lesson.contentBlocks.find(block => block.slug === ref)?.text ?? '').join('\n');
    if (activity.activityType === 'reading' || activity.activityType === 'listening') {
      if (!sources.trim()) issue('IELTS_TOPIC_UNPLAYABLE', activity.slug, 'Comprehension requires its actual authored source.');
      for (const question of activity.payload.questions) {
        const citation = /^([a-z0-9-]+):([1-9][0-9]*)$/u.exec(question.evidence);
        const citedSource = citation ? publishedLesson.evidenceSources?.[citation[1]!] ?? lesson.contentBlocks.find(block => block.slug === citation[1] && activity.contentReferences.includes(block.slug))?.text : undefined;
        const quote = citedSource && citation ? citedSource.split('\n')[Number(citation[2]) - 1] : question.evidence;
        if (!quote?.trim() || !sources.toLowerCase().includes(quote.toLowerCase()) || question.answerIndex >= question.options.length) issue('IELTS_TOPIC_ANSWER_EVIDENCE', `${activity.slug}.${question.slug}`, 'Answer evidence must occur in the referenced source.');
      }
    } else if (!activity.payload.prompt.trim() || !activity.payload.sampleAnswer.trim() || !activity.payload.requiredPhrases.length) issue('IELTS_TOPIC_PRODUCTIVE_TASK', activity.slug, 'Productive tasks need prompts and assessment content.');
  }
  const supportedDurations: IeltsStudyDuration[] = [];
  for (const durationMinutes of [90, 120, 150] as const) {
    try {
      const plan = planFoundationSession({ mission, durationMinutes, reviewItems: [], productivePairPerRespondBlock: true });
      const ids = plan.blocks.flatMap(block => block.activityIds);
      if (new Set(ids).size === ids.length && plan.blocks.filter(block => block.type === 'respond').every(block => {
        const skills = lesson.activities.filter(activity => block.activityIds.includes(activity.id)).map(activity => activity.activityType);
        return skills.includes('speaking') && skills.includes('writing');
      })) supportedDurations.push(durationMinutes);
    } catch { /* Unsupported authored duration is omitted, never padded. */ }
  }
  if (!supportedDurations.length) issue('IELTS_TOPIC_PLAN', 'activities', 'No 90+ minute plan covers all required authored blocks.');
  return { canPublish: issues.length === 0, supportedDurations: issues.length ? [] : supportedDurations, qualifiedModes: [], issues };
}
