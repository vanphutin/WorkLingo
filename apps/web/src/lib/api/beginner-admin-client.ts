import {z} from 'zod';
import {beginnerTargetSchema,beginnerActionSchema,contentImportSchema,validateContentImportResultSchema,publishContentImportResultSchema,curriculumDraftSchema,curriculumRevisionSchema,type BeginnerTarget,type BeginnerWriteInput,type BeginnerEditorialPlan,type FoundationCommand,type SaveFoundationDraftInput} from '@worklingo/contracts';
import {ApiError,learnerActivityDtoSchema} from './api-client';
const id=z.uuid(),text=z.string();
const lesson=z.object({code:text,title:text,status:z.literal('PLANNED'),grammar:text,pronunciation:text,vocabulary:text,reading:text,listening:text,speaking:text,writing:text,objective:text,prerequisite:text});
const unit=z.object({code:text,title:text,canDo:text,hardPrerequisite:text,lessons:z.array(lesson).length(4)});
const plan=z.object({version:z.literal(1),stages:z.array(z.object({code:text,path:text,units:z.array(unit).length(4)})).length(5),videoSlots:z.array(z.object({code:text,purpose:text,type:text,lessonCodes:z.array(text),slot:text,outline:text,exercises:text,languageAndCaption:text,production:z.literal('NOT_STARTED'),priority:text,reuse:text})).length(55)});
const mission=z.object({id,slug:text,title:text,objective:text,order:z.number(),revision:z.number(),status:text,curriculumRevisions:z.array(z.object({id,revision:z.number(),status:text})).default([])});
const level=z.object({id,code:text,name:text,pathId:id,status:text,revision:z.number(),missions:z.array(mission)});
const path=z.object({id,programId:id,slug:text,name:text,status:text,revision:z.number(),levels:z.array(level)});
const binding=z.object({editorialCode:text,target:beginnerTargetSchema,status:text,draftRevision:z.number(),sourceHash:text,reviewHash:text.nullable(),lessonVersions:z.array(z.object({id,version:z.number(),status:text}))});
const workspaceSchema=z.object({plan,paths:z.array(path),bindings:z.array(binding),writesEnabled:z.boolean(),actions:z.array(beginnerActionSchema),environmentId:text.nullable(),programId:id.optional()});
export type BeginnerWorkspaceData=Omit<z.infer<typeof workspaceSchema>,'plan'>&{plan:BeginnerEditorialPlan};
const importSchema=z.object({draft:contentImportSchema,reviewHash:text.nullable(),reviewKind:text.nullable(),selectedAudioArtifacts:z.record(text,id),audioArtifacts:z.array(z.object({id,audioScriptSlug:text,scriptHash:text,status:text,checksum:text}))});
export type BeginnerImportData=z.infer<typeof importSchema>;
const previewSchema=z.object({kind:z.enum(['PUBLISHED_PREVIEW','DRAFT_PREVIEW']),title:text,sourceHash:text,lessonVersionId:id,previewOnly:z.literal(true),plan:z.object({durationMinutes:z.literal(45),missionId:id,lessonVersionId:id,blocks:z.array(z.object({type:text,order:z.number(),targetMinutes:z.number(),activityIds:z.array(id),skills:z.array(text)})).length(3)}),activities:z.array(learnerActivityDtoSchema),audio:z.array(z.object({activityId:id,artifactId:id.nullable()}))}).strict().superRefine((value,ctx)=>{
 const forbidden=new Set(['answerIndex','sampleAnswer','requiredPhrases','explanation','evidence','rubricId','rubricVersion','audioText']);
 const scan=(v:unknown):boolean=>Array.isArray(v)?v.some(scan):!!v&&typeof v==='object'&&Object.entries(v).some(([key,val])=>forbidden.has(key)||scan(val));
 if(scan(value))ctx.addIssue({code:'custom',message:'Unsafe learner preview'});
});
export type BeginnerPreviewData=z.infer<typeof previewSchema>;
const reviewSchema=z.object({reviewHash:text,reviewKind:z.literal('FIXTURE_TECHNICAL_REVIEW')});
export class BeginnerAdminClient{
 private readonly base:string;
 constructor(base?:string){this.base=(base??process.env.NEXT_PUBLIC_API_BASE_URL??'/api/v1').replace(/\/+$/u,'');}
 private async request<T>(suffix:string,method:string,schema:z.ZodType<T>,body?:unknown):Promise<T>{
  const response=await fetch(this.base+'/admin/beginner'+suffix,{method,credentials:'include',...(body!==undefined?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
  const data:unknown=await response.json().catch(()=>null);
  if(!response.ok){const parsed=z.object({code:text.optional(),message:text.optional(),error:z.object({code:text.optional(),message:text.optional()}).optional()}).safeParse(data);
   throw new ApiError({status:response.status,code:parsed.success?parsed.data.error?.code??parsed.data.code??'API_ERROR':'API_ERROR',message:parsed.success?parsed.data.error?.message??parsed.data.message??'Beginner request failed':'Beginner request failed'});}
  return schema.parse(data);
 }
 private query(target:BeginnerTarget,versionId?:string,selection?:Record<string,string>){const q=new URLSearchParams({target:JSON.stringify(beginnerTargetSchema.parse(target))});if(versionId)q.set('lessonVersionId',id.parse(versionId));if(selection)q.set('audio',JSON.stringify(selection));return q.toString();}
 private importId(target:BeginnerTarget){if(!target.importId)throw new Error('Select an existing Beginner draft');return id.parse(target.importId);}
 workspace():Promise<BeginnerWorkspaceData>{return this.request('','GET',workspaceSchema);}
 getImport(target:BeginnerTarget){return this.request('/imports/'+this.importId(target)+'?'+this.query(target),'GET',importSchema);}
 createDraft(input:BeginnerWriteInput){return this.request('/drafts','POST',z.object({draft:contentImportSchema,target:beginnerTargetSchema}),input);}
 updateSource(input:BeginnerWriteInput){return this.request('/imports/'+this.importId(input.target)+'/source','PATCH',contentImportSchema,input);}
 validate(input:BeginnerWriteInput){return this.request('/imports/'+this.importId(input.target)+'/validate','POST',validateContentImportResultSchema,input);}
 review(input:BeginnerWriteInput){return this.request('/imports/'+this.importId(input.target)+'/review','POST',reviewSchema,input);}
 publish(input:BeginnerWriteInput){return this.request('/imports/'+this.importId(input.target)+'/publish','POST',publishContentImportResultSchema,input);}
 preview(target:BeginnerTarget,versionId?:string,selection?:Record<string,string>){return this.request('/imports/'+this.importId(target)+'/learner-preview?'+this.query(target,versionId,selection),'GET',previewSchema);}
 audioUrl(target:BeginnerTarget,artifactId:string,versionId?:string){return this.base+'/admin/beginner/imports/'+this.importId(target)+'/audio/'+id.parse(artifactId)+'?'+this.query(target,versionId);}
 node(kind:string,target:BeginnerTarget,command:unknown){return this.request('/curriculum/'+encodeURIComponent(kind),'POST',z.unknown(),{target,command});}
 foundation(target:BeginnerTarget){
  if(!target.missionId)throw new Error('Select a Beginner Unit');const suffix='/missions/'+target.missionId+'/foundation';
  return {
   getDraft:(_missionId:string)=>this.request(suffix+'?'+this.query(target),'GET',curriculumDraftSchema.extend({reviewedRevision:z.number().nullable(),reviewHash:text.nullable()})),
   saveDraft:(_missionId:string,command:SaveFoundationDraftInput)=>this.request(suffix+'/save','POST',curriculumDraftSchema,{target,command}),
   validateDraft:(_missionId:string,command:FoundationCommand)=>this.request(suffix+'/validate','POST',curriculumDraftSchema,{target,command}),
   publishDraft:(_missionId:string,command:FoundationCommand)=>this.request(suffix+'/publish','POST',curriculumRevisionSchema,{target,command}),
   reviewDraft:(_missionId:string,command:FoundationCommand)=>this.request(suffix+'/review','POST',reviewSchema,{target,command}),
  };
 }
}
export const beginnerAdminClient=new BeginnerAdminClient();
