import { sessionPlanSchema, type SessionPlan } from '@worklingo/contracts';
import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';

function freeze<T>(value:T):T {
  if(value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Provider/database-free boundary: the future resolver supplies ONE exact bound version. */
export function planBeginnerSession(input:{mission:PublishedMission;expectedLessonVersionId:string;durationMinutes:45}):SessionPlan {
  if(input.mission.lessonVersion.id!==input.expectedLessonVersionId) throw new Error('BEGINNER_LESSON_VERSION_MISMATCH');
  if(input.durationMinutes!==45 || input.mission.purpose!=='learning') throw new Error('INVALID_BEGINNER_PLAN');
  const snapshot=lessonSnapshotSchema.parse(input.mission.lessonVersion);
  if(snapshot.formatVersion!=='WorkLingoLesson/1.2' || !snapshot.foundation) throw new Error('INVALID_BEGINNER_PLAN');
  const activities=snapshot.activities;
  const objectiveMap=new Map(snapshot.foundation.objectives.map(o=>[o.slug,o]));
  if(objectiveMap.size!==snapshot.foundation.objectives.length || !snapshot.foundation.objectives.some(o=>o.required)) throw new Error('INVALID_BEGINNER_EVIDENCE');
  if(activities.length!==8 || new Set(activities.map(a=>a.id)).size!==8 || new Set(activities.map(a=>a.slug)).size!==8) throw new Error('INVALID_BEGINNER_INVENTORY');
  for(const activity of activities){
    const refs=snapshot.foundation.activityObjectives[activity.slug];
    if(!refs?.length || new Set(refs).size!==refs.length || refs.some(r=>!objectiveMap.has(r)) || !refs.some(r=>objectiveMap.get(r)!.skills.includes(activity.activityType))) throw new Error('INVALID_BEGINNER_EVIDENCE');
  }
  const slugs=new Set(activities.map(a=>a.slug));
  if(Object.keys(snapshot.foundation.activityObjectives).some(s=>!slugs.has(s))) throw new Error('INVALID_BEGINNER_EVIDENCE');
  for(const objective of snapshot.foundation.objectives.filter(o=>o.required)) for(const skill of objective.skills){
    if(!activities.some(a=>a.activityType===skill && snapshot.foundation!.activityObjectives[a.slug]!.includes(objective.slug))) throw new Error('INVALID_BEGINNER_EVIDENCE');
  }
  const groups=[{type:'readDecode' as const,skills:['reading'] as const,count:3},{type:'listenReason' as const,skills:['listening'] as const,count:3},{type:'respond' as const,skills:['speaking','writing'] as const,count:2}];
  const blocks=groups.map((group,index)=>{
    const chosen=activities.filter(a=>a.learningBlock===group.type).sort((a,b)=>a.order-b.order);
    if(chosen.length!==group.count || group.skills.some(skill=>chosen.filter(a=>a.activityType===skill).length!==(group.count===3?3:1)) || chosen.some(a=>a.skills.length!==1 || a.skills[0]!==a.activityType)) throw new Error('INVALID_BEGINNER_INVENTORY');
    return {type:group.type,order:index+1,targetMinutes:15,activityIds:chosen.map(a=>a.id),skills:[...group.skills]};
  });
  return freeze(sessionPlanSchema.parse({durationMinutes:45,missionId:input.mission.id,lessonVersionId:input.expectedLessonVersionId,blocks}));
}
