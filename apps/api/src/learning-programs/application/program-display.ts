import type {ProgramVersion} from '@prisma/client';
import {programReleaseDisplaySchema,programVersionInputSchema} from '@worklingo/contracts';
/** Deliberately allowlisted presentation only; never return a release snapshot to learners. */
export function releaseDisplay(row:Pick<ProgramVersion,'id'|'version'|'source'|'status'|'snapshot'>){
 const metadata={id:row.id,version:row.version,source:row.source,status:row.status};
 if(row.source==='AUTHORED'){
  const c=programVersionInputSchema.parse(row.snapshot);
  return programReleaseDisplaySchema.parse({...metadata,title:c.title,description:c.description,objectives:c.objectives,difficulty:c.difficulty,estimatedMinutes:c.estimatedMinutes,supportedLanguages:c.supportedLanguages,audiences:c.audiences});
 }
 const snapshot=row.snapshot as {title?:unknown};
 return programReleaseDisplaySchema.parse({...metadata,title:typeof snapshot.title==='string'?snapshot.title:'Legacy curriculum'});
}
