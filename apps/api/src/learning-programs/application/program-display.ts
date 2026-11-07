import type {ProgramVersion} from '@prisma/client';
import {programReleaseDisplaySchema,programVersionInputSchema} from '@worklingo/contracts';
/** Deliberately allowlisted presentation only; never return a release snapshot to learners. */
export function releaseDisplay(row:Pick<ProgramVersion,'id'|'version'|'source'|'status'|'snapshot'>){
 const metadata={id:row.id,version:row.version,source:row.source,status:row.status};
 if(row.source==='AUTHORED'){
  const c=programVersionInputSchema.parse(row.snapshot);
  const curriculumOverview = c.curriculumBindings.map(binding => ({
   title: binding.title,
   lessonCount: binding.lessons.length,
   activityCount: binding.lessons.reduce((total, lesson) => total + lesson.activityIds.length, 0),
   estimatedMinutes: binding.lessons.reduce((total, lesson) => total + lesson.estimatedMinutes, 0),
   lessons: binding.lessons.map(lesson => ({ title: lesson.title, estimatedMinutes: lesson.estimatedMinutes })),
  }));
  return programReleaseDisplaySchema.parse({
   ...metadata, curriculumOverview,
   lessonCount: curriculumOverview.reduce((total, unit) => total + unit.lessonCount, 0),
   activityCount: curriculumOverview.reduce((total, unit) => total + unit.activityCount, 0),
   title:c.title,description:c.description,objectives:c.objectives,difficulty:c.difficulty,
   estimatedMinutes:c.estimatedMinutes,supportedLanguages:c.supportedLanguages,audiences:c.audiences,
  });
 }
 const snapshot=row.snapshot as {title?:unknown};
 return programReleaseDisplaySchema.parse({...metadata,title:typeof snapshot.title==='string'?snapshot.title:'Legacy curriculum'});
}
