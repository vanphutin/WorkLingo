import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {foundationMissionFixture} from '@worklingo/test-fixtures';
import {validateProgramPublication,type PublicationRevision} from './program-publication.js';
function revision(id='r',missionId='m'):PublicationRevision {
 const version=randomUUID(),activitySlug='write-first-message';
 const lesson={...structuredClone(foundationMissionFixture.lesson),contentBlocks:foundationMissionFixture.lesson.contentBlocks.map(b=>({...b,id:randomUUID()})),wordBanks:foundationMissionFixture.lesson.wordBanks.map(b=>({...b,id:randomUUID(),languageBlocks:b.languageBlocks.map(l=>({...l,id:randomUUID()}))})),activities:foundationMissionFixture.lesson.activities.map((a,order)=>({...a,order,id:randomUUID()}))};
 return {id,missionId,status:'PUBLISHED',snapshot:{category:'writing',objectives:[{slug:'write',statement:'Write a message',required:true,skills:['writing'],evidence:[{lessonVersionId:version,activitySlug,languageBlockSlugs:[]}]}],prerequisiteRevisionIds:[]},mission:{status:'PUBLISHED',level:{status:'PUBLISHED',path:{status:'PUBLISHED',programId:'p'}}},prerequisites:[],lessons:[{lessonVersionId:version,lessonVersion:{status:'PUBLISHED',parsedContent:lesson,lesson:{missions:[{missionId}]}}}]};
}
describe('R2 publication graph',()=>{
 it('accepts exact published lesson and required objective evidence',()=>{expect(()=>validateProgramPublication('p',['r'],[revision()])).not.toThrow();});
 it('rejects missing or repeated revisions',()=>{expect(()=>validateProgramPublication('p',['missing'],[])).toThrow();expect(()=>validateProgramPublication('p',['r','r'],[revision()])).toThrow();});
 it.each(['archived','foreign','multi-lesson','missing-evidence','wrong-attachment','duplicate-mission'])('rejects %s publication',scenario=>{const row=revision();const rows=[row],ids=['r'];if(scenario==='archived')row.status='ARCHIVED';if(scenario==='foreign')row.mission.level.path.programId='other';if(scenario==='multi-lesson')row.lessons.push(row.lessons[0]!);if(scenario==='missing-evidence')row.snapshot={};if(scenario==='wrong-attachment')row.lessons[0]!.lessonVersion.lesson.missions=[];if(scenario==='duplicate-mission'){rows.push(revision('r2'));ids.push('r2');}expect(()=>validateProgramPublication('p',ids,rows)).toThrow();});
 it('rejects prerequisites outside the frozen list and cycles',()=>{const a=revision(),b=revision('b','other');a.prerequisites=[{prerequisiteRevisionId:'b'}];(a.snapshot as {prerequisiteRevisionIds:string[]}).prerequisiteRevisionIds=['b'];expect(()=>validateProgramPublication('p',['r'],[a])).toThrow();b.prerequisites=[{prerequisiteRevisionId:'r'}];(b.snapshot as {prerequisiteRevisionIds:string[]}).prerequisiteRevisionIds=['r'];expect(()=>validateProgramPublication('p',['r','b'],[a,b])).toThrow();});
});
