import { describe,expect,it } from 'vitest';
import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { planBeginnerSession } from './beginner-session-planner.js';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export function beginnerMission(): PublishedMission {
  const base=foundationMissionFixture.lesson;
  const skills=['reading','reading','reading','listening','listening','listening','speaking','writing'] as const;
  const snapshot=lessonSnapshotSchema.parse({...base,formatVersion:'WorkLingoLesson/1.2',instructions:[{slug:'guide',phase:'readDecode',order:0,text:'Read and respond.'}],
    contentBlocks:base.contentBlocks.map((b,i)=>({...b,id:id(10+i)})),wordBanks:base.wordBanks.map((b,i)=>({...b,id:id(20+i),languageBlocks:b.languageBlocks.map((l,j)=>({...l,id:id(30+i*10+j)}))})),
    activities:skills.map((skill,i)=>{const a=base.activities.find(a=>a.activityType===skill)!;return {...a,id:id(100+i),slug:skill+'-'+i,order:i,skills:[skill],learningBlock:skill==='reading'?'readDecode':skill==='listening'?'listenReason':'respond',payload:skill==='speaking'||skill==='writing'?{...a.payload,requiredPhrases:[],rubricId:skill==='speaking'?'beginner-guided-speaking':'beginner-short-writing',rubricVersion:'1',...(skill==='speaking'?{mode:'guided_response'}:{})}:a.payload};}),
    foundation:{category:'grammar',templateId:'pilot',templateVersion:1,responseRubrics:{},objectives:['reading','listening','speaking','writing'].map(skill=>({slug:skill,statement:'Task '+skill,skills:[skill],required:true})),activityObjectives:Object.fromEntries(skills.map((skill,i)=>[skill+'-'+i,[skill]]))},
  });
  return {id:id(200),slug:'mg01',title:'Pilot',objective:'Introduce yourself',purpose:'learning',levelCode:'MG_F0',lessonVersion:{...snapshot,id:id(202),version:2}};
}
describe('Beginner planner',()=>{
  it('plans exact selected V2 instead of first V1 and freezes all eight activities',()=>{
    const mission=beginnerMission(),before=JSON.stringify(mission);
    const plan=planBeginnerSession({mission,expectedLessonVersionId:id(202),durationMinutes:45});
    expect(plan.lessonVersionId).toBe(id(202));expect(plan.missionId).toBe(id(200));
    expect(plan.blocks.map(b=>b.activityIds)).toEqual([[id(100),id(101),id(102)],[id(103),id(104),id(105)],[id(106),id(107)]]);
    expect(plan.blocks.map(b=>b.targetMinutes)).toEqual([15,15,15]);
    expect(Object.isFrozen(plan.blocks[0]!.activityIds)).toBe(true);
    expect(plan).toEqual(planBeginnerSession({mission,expectedLessonVersionId:id(202),durationMinutes:45}));expect(JSON.stringify(mission)).toBe(before);
    expect(JSON.stringify(plan)).not.toContain('sampleAnswer');
  });
  it('rejects version mismatch before planning and never falls back',()=>{
    expect(()=>planBeginnerSession({mission:beginnerMission(),expectedLessonVersionId:id(201),durationMinutes:45})).toThrow('BEGINNER_LESSON_VERSION_MISMATCH');
  });
  it('requires 1.2, all skills, unique IDs and complete selected objective mapping',()=>{
    const base=beginnerMission();
    for(const change of [(m:PublishedMission)=>{delete m.lessonVersion.formatVersion;},(m:PublishedMission)=>{m.lessonVersion.activities.pop();},(m:PublishedMission)=>{m.lessonVersion.activities[0]!.id=m.lessonVersion.activities[1]!.id;},(m:PublishedMission)=>{delete m.lessonVersion.foundation!.activityObjectives['reading-0'];},(m:PublishedMission)=>{m.lessonVersion.foundation!.objectives[0]!.skills=['speaking'];}]){
      const mission=structuredClone(base);change(mission);expect(()=>planBeginnerSession({mission,expectedLessonVersionId:id(202),durationMinutes:45})).toThrow();
    }
  });
});
