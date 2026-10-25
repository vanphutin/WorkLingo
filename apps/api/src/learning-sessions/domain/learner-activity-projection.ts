import {NotFoundException} from '@nestjs/common';
import type {LessonSnapshot} from '../../curriculum/domain/curriculum.types.js';
import type {LearnerActivityDto} from '../application/learning-session.types.js';
export function projectLearnerActivity(snapshot:LessonSnapshot,activityId:string):LearnerActivityDto {
 const activity=snapshot.activities.find(a=>a.id===activityId);if(!activity)throw new NotFoundException('Activity not found in this session');
    const content = snapshot.contentBlocks.filter((block) => activity.contentReferences.includes(block.slug));
    const languageBlocks = snapshot.wordBanks
      .flatMap((bank) => bank.languageBlocks)
      .filter((block) => activity.languageBlockReferences.includes(block.slug));
    const beginner=snapshot.formatVersion==='WorkLingoLesson/1.2';
    const recall = snapshot.foundation?.category === 'vocabulary' && activity.activityType === 'writing' && activity.learningBlock === 'respond';
    const payload = activity.activityType === 'reading' || activity.activityType === 'listening'
      ? {
          prompt: activity.payload.prompt,
          questions: activity.payload.questions.map(({ options, prompt, slug }) => ({ options, prompt, slug })),
        }
      : {
          prompt: activity.payload.prompt,
          ...(beginner ? {} : recall ? {requiredPhraseCount:activity.payload.requiredPhrases.length} : {requiredPhrases: activity.payload.requiredPhrases}),
          minWords: activity.payload.minWords,
          ...(activity.activityType === 'speaking'
            ? {
                mode: activity.payload.mode,
                ...(activity.payload.mode === 'shadowing'
                  ? { sampleAnswer: activity.payload.sampleAnswer }
                  : {}),
              }
            : {}),
        };
    return {
      activityType: activity.activityType,
      ...(beginner ? {instructions:(snapshot.instructions ?? []).filter(i=>i.phase===activity.learningBlock)} : {}),
      ...(!beginner && activity.payload.audioText ? { audioText: activity.payload.audioText } : {}),
      content:beginner&&activity.activityType==='listening'?[]:content,
      foundationCategory: snapshot.foundation?.category ?? null,
      id: activity.id,
      languageBlocks: recall ? [] : languageBlocks,
      learningBlock: activity.learningBlock,
      payload,
      skills: activity.skills,
      slug: activity.slug,
    };
}
