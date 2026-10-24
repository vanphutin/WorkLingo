import { ForbiddenException,UnprocessableEntityException } from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {beginnerTargetSchema,type BeginnerTarget,type BeginnerAction,type BeginnerPermission} from '@worklingo/contracts';
import {validateBeginnerPermission} from './beginner-environment-preflight.js';

export interface BeginnerActor {id:string;roles:readonly string[]}
export interface BeginnerAuthorizationPort {
 readPermission():Promise<BeginnerPermission|null>;
 verifyTarget(tx:Prisma.TransactionClient,target:BeginnerTarget):Promise<void>;
 verifyEnvironment(tx:Prisma.TransactionClient,permission:BeginnerPermission):Promise<void>;
}
export interface BeginnerAuthoringContext {readonly kind?:never}
interface State {actorId:string;action:BeginnerAction;target:BeginnerTarget;permission:BeginnerPermission;port:BeginnerAuthorizationPort}
const contexts=new WeakMap<object,State>();
function denied(code:string):never{throw new ForbiddenException({code,message:code});}
export class BeginnerAuthoringPolicy {
 constructor(private readonly port:BeginnerAuthorizationPort){}
 async permission():Promise<BeginnerPermission|null>{const p=await this.port.readPermission();return p?validateBeginnerPermission(p):null;}
 async authorize(actor:BeginnerActor,action:BeginnerAction,input:BeginnerTarget,tx:Prisma.TransactionClient):Promise<BeginnerAuthoringContext>{
  if(!actor.roles.some(r=>r==='CONTENT_ADMIN'||r==='SYSTEM_ADMIN'))denied('BEGINNER_FORBIDDEN');
  const permission=validateBeginnerPermission(await this.port.readPermission());
  const target=beginnerTargetSchema.parse(input);
  if(permission.programId!==target.programId||!permission.actions.includes(action))denied('BEGINNER_SCOPE_MISMATCH');
  await this.port.verifyEnvironment(tx,permission);await this.port.verifyTarget(tx,target);
  const context=Object.freeze({});contexts.set(context,{actorId:actor.id,action,target:Object.freeze({...target}),permission,port:this.port});return context;
 }
}
export async function assertBeginnerContext(context:unknown,actorId:string,action:BeginnerAction,tx:Prisma.TransactionClient,selection:Partial<BeginnerTarget>={}):Promise<BeginnerTarget>{
 const state=context&&typeof context==='object'?contexts.get(context):undefined;
 if(!state)throw new UnprocessableEntityException({code:'BEGINNER_AUTHORING_DISABLED',message:'BEGINNER_AUTHORING_DISABLED'});
 if(state.actorId!==actorId||state.action!==action||Object.entries(selection).some(([k,v])=>v!==undefined&&state.target[k as keyof BeginnerTarget]!==v))denied('BEGINNER_SCOPE_MISMATCH');
 const permission=validateBeginnerPermission(await state.port.readPermission());
 if(permission.recordHash!==state.permission.recordHash||permission.environmentId!==state.permission.environmentId||!permission.actions.includes(action))denied('BEGINNER_SCOPE_MISMATCH');
 await state.port.verifyEnvironment(tx,permission);await state.port.verifyTarget(tx,state.target);
 return state.target;
}
export function hasBeginnerContext(context:unknown):context is BeginnerAuthoringContext{return !!context&&typeof context==='object'&&contexts.has(context);}
export async function verifyBeginnerTarget(tx:Prisma.TransactionClient,target:BeginnerTarget):Promise<void>{
 const program=await tx.learningProgram.findUnique({where:{id:target.programId},select:{slug:true}});
 if(program?.slug!=='beginner')denied('BEGINNER_WRONG_PROGRAM');
 if(target.pathId){const row=await tx.learningPath.findUnique({where:{id:target.pathId},select:{programId:true}});if(row?.programId!==target.programId)denied('BEGINNER_WRONG_PATH');}
 if(target.levelId){const row=await tx.level.findUnique({where:{id:target.levelId},select:{pathId:true}});if(row?.pathId!==target.pathId)denied('BEGINNER_WRONG_LEVEL');}
 if(target.missionId){const row=await tx.mission.findUnique({where:{id:target.missionId},select:{levelId:true}});if(row?.levelId!==target.levelId)denied('BEGINNER_WRONG_MISSION');}
 if(target.lessonId){
  const row=await tx.lesson.findUnique({where:{id:target.lessonId},include:{missions:{include:{mission:{include:{level:{include:{path:true}}}}}}}});
  if(!row||row.topicGroupId||!row.missions.length||!row.missions.some(b=>b.missionId===target.missionId)||row.missions.some(b=>b.mission.level.path.programId!==target.programId))denied('BEGINNER_SHARED_LESSON');
 }
 if(target.importId){const row=await tx.contentImport.findUnique({where:{id:target.importId},select:{lessonId:true,topicGroupId:true}});if(!target.lessonId||row?.lessonId!==target.lessonId||row.topicGroupId)denied('BEGINNER_IMPORT_TARGET_MISMATCH');}
}
/** Protect existing generic mutation routes, including disguised 1.0 source. */
export async function denyUnscopedBeginnerMutation(tx:Prisma.TransactionClient,selection:{lessonId?:string|null;missionId?:string;pathId?:string;levelId?:string;programId?:string}):Promise<void>{
 if(selection.lessonId){
  const rows=await tx.missionLesson.findMany({where:{lessonId:selection.lessonId},select:{mission:{select:{level:{select:{path:{select:{program:{select:{slug:true}}}}}}}}}});
  if(rows?.some(r=>r.mission?.level?.path?.program?.slug==='beginner'))denied('BEGINNER_AUTHORING_DISABLED');
 } else if(selection.missionId){
  const row=await tx.mission.findUnique({where:{id:selection.missionId},select:{level:{select:{path:{select:{program:{select:{slug:true}}}}}}}});
  if(row?.level?.path?.program?.slug==='beginner')denied('BEGINNER_AUTHORING_DISABLED');
 } else if(selection.levelId){
  const row=await tx.level.findUnique({where:{id:selection.levelId},select:{path:{select:{program:{select:{slug:true}}}}}});
  if(row?.path?.program?.slug==='beginner')denied('BEGINNER_AUTHORING_DISABLED');
 } else if(selection.pathId){
  const row=await tx.learningPath.findUnique({where:{id:selection.pathId},select:{program:{select:{slug:true}}}});
  if(row?.program?.slug==='beginner')denied('BEGINNER_AUTHORING_DISABLED');
 } else if(selection.programId){
  const row=await tx.learningProgram.findUnique({where:{id:selection.programId},select:{slug:true}});
  if(row?.slug==='beginner')denied('BEGINNER_AUTHORING_DISABLED');
 }
}

export function beginnerContextDescriptor(context:BeginnerAuthoringContext):{environmentId:string;target:BeginnerTarget;action:BeginnerAction}{
 const state=contexts.get(context);if(!state)denied('BEGINNER_AUTHORING_DISABLED');return {environmentId:state.permission.environmentId,target:state.target,action:state.action};
}
export async function lockBeginnerContext(tx:Prisma.TransactionClient,context:BeginnerAuthoringContext,actorId:string,action:BeginnerAction):Promise<BeginnerTarget>{
 const t=await assertBeginnerContext(context,actorId,action,tx);
 await tx.$queryRaw`SELECT "id" FROM "LearningProgram" WHERE "id"=${t.programId}::uuid FOR UPDATE`;
 if(t.pathId)await tx.$queryRaw`SELECT "id" FROM "LearningPath" WHERE "id"=${t.pathId}::uuid FOR SHARE`;
 if(t.levelId)await tx.$queryRaw`SELECT "id" FROM "Level" WHERE "id"=${t.levelId}::uuid FOR SHARE`;
 if(t.missionId)await tx.$queryRaw`SELECT "id" FROM "Mission" WHERE "id"=${t.missionId}::uuid FOR UPDATE`;
 if(t.lessonId)await tx.$queryRaw`SELECT "id" FROM "Lesson" WHERE "id"=${t.lessonId}::uuid FOR UPDATE`;
 if(t.importId)await tx.$queryRaw`SELECT "id" FROM "ContentImport" WHERE "id"=${t.importId}::uuid FOR UPDATE`;
 return assertBeginnerContext(context,actorId,action,tx);
}
