import { UnprocessableEntityException } from '@nestjs/common';
import { curriculumDefinitionInputSchema } from '@worklingo/contracts';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
export interface PublicationRevision {
 id:string;missionId:string;status:string;snapshot:unknown;
 mission:{status:string;level:{status:string;path:{status:string;programId:string}}};
 prerequisites:{prerequisiteRevisionId:string}[];
 lessons:{lessonVersionId:string;lessonVersion:{status:string;parsedContent:unknown;lesson:{missions:{missionId:string}[]}}}[];
}
export function validateProgramPublication(programId:string,ids:readonly string[],rows:readonly PublicationRevision[]):void {
 const fail=()=>{throw new UnprocessableEntityException('PROGRAM_CURRICULUM_INVALID');};
 if(!ids.length||new Set(ids).size!==ids.length||rows.length!==ids.length||new Set(rows.map(r=>r.id)).size!==ids.length)fail();
 const selected=new Map(rows.map(row=>[row.id,row]));const missions=new Set<string>();
 for(const id of ids){
  const row=selected.get(id);if(!row||row.status!=='PUBLISHED')return fail();
  const {mission}=row;
  if(missions.has(row.missionId)||mission.status!=='PUBLISHED'||mission.level.status!=='PUBLISHED'||mission.level.path.status!=='PUBLISHED'||mission.level.path.programId!==programId||row.lessons.length!==1)fail();
  missions.add(row.missionId);
  const binding=row.lessons[0]!;
  if(binding.lessonVersion.status!=='PUBLISHED'||!binding.lessonVersion.lesson.missions.some(m=>m.missionId===row.missionId))fail();
  const definition=curriculumDefinitionInputSchema.safeParse(row.snapshot),snapshot=lessonSnapshotSchema.safeParse(binding.lessonVersion.parsedContent);
  if(!definition.success||!snapshot.success||snapshot.data.formatVersion==='WorkLingoLesson/1.2')return fail();
  const required=definition.data.objectives.filter(o=>o.required);if(!required.length)fail();
  for(const objective of required){
   for(const skill of objective.skills)if(!objective.evidence.some(e=>e.lessonVersionId===binding.lessonVersionId&&snapshot.data.activities.some(a=>a.slug===e.activitySlug&&a.skills.includes(skill))))fail();
   for(const e of objective.evidence){const activity=snapshot.data.activities.find(a=>a.slug===e.activitySlug);if(e.lessonVersionId!==binding.lessonVersionId||!activity||e.languageBlockSlugs.some(slug=>!activity.languageBlockReferences.includes(slug)))fail();}
  }
  const refs=row.prerequisites.map(p=>p.prerequisiteRevisionId);
  if(refs.some(ref=>!selected.has(ref))||new Set(refs).size!==refs.length||JSON.stringify([...refs].sort())!==JSON.stringify([...definition.data.prerequisiteRevisionIds].sort()))fail();
 }
 const visiting=new Set<string>(),visited=new Set<string>();
 const visit=(id:string)=>{if(visiting.has(id))fail();if(visited.has(id))return;visiting.add(id);for(const ref of selected.get(id)!.prerequisites)visit(ref.prerequisiteRevisionId);visiting.delete(id);visited.add(id);};
 ids.forEach(visit);
}
