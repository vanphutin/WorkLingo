import { foundationMissionFixture } from '@worklingo/test-fixtures';
import { lessonSnapshotSchema,type PublishedMission } from '../../../curriculum/domain/curriculum.types.js';
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
