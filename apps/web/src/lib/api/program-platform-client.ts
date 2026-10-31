import { z } from 'zod';
import {
 programPageSchema, programVersionCommandSchema, programVersionTransitionSchema, programVersionListSchema, programVersionResponseSchema, programAuthoringOptionsSchema,
 archiveProgramCommandSchema, rollbackProgramCommandSchema, duplicateProgramCommandSchema, adminProgramSchema,
 assignProgramEnrollmentSchema, programEnrollmentTransitionSchema, programEnrollmentSchema, programEnrollmentListSchema, enrollmentHistorySchema,
 programAnalyticsQuerySchema, programAnalyticsSchema, programProgressSchema, programProgressHistorySchema, programReviewsSchema, programRecalculateSchema, completeProgramReviewSchema,
 type ProgramPageInput, type ProgramVersionCommand, type ProgramVersionTransitionInput, type AssignProgramEnrollmentInput, type ProgramEnrollmentTransitionInput, type ProgramAnalyticsQuery,
} from '@worklingo/contracts';
import { ieltsRequest } from './ielts-request';
const id=(value:string)=>z.uuid().parse(value);
const root=(value:string)=>`/admin/learning-programs/${id(value)}`;
const mine=(value:string)=>`/me/program-enrollments/${id(value)}`;
const query=(schema:z.ZodType,input:unknown)=>new URLSearchParams(Object.entries(schema.parse(input) as Record<string,unknown>).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)])).toString();
const page=(input:Partial<ProgramPageInput>={})=>query(programPageSchema,input);
const post=<T>(path:string,schema:z.ZodType<T>,input:unknown,validation:z.ZodType,method='POST')=>ieltsRequest(path,schema,{method,body:JSON.stringify(validation.parse(input))});
export class ProgramPlatformClient {
 async versions(programId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${root(programId)}/versions?${page(paging)}`,programVersionListSchema);}
 async options(programId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${root(programId)}/authoring-options?${page(paging)}`,programAuthoringOptionsSchema);}
 async create(programId:string,input:ProgramVersionCommand) {return post(`${root(programId)}/versions`,programVersionResponseSchema,input,programVersionCommandSchema);}
 async save(programId:string,versionId:string,input:ProgramVersionCommand) {return post(`${root(programId)}/versions/${id(versionId)}`,programVersionResponseSchema,input,programVersionCommandSchema,'PUT');}
 async transition(programId:string,versionId:string,input:ProgramVersionTransitionInput) {return post(`${root(programId)}/versions/${id(versionId)}/transition`,programVersionResponseSchema,input,programVersionTransitionSchema);}
 async preview(programId:string,versionId:string) {return ieltsRequest(`${root(programId)}/versions/${id(versionId)}/preview`,programVersionResponseSchema);}
 async archive(programId:string,input:z.infer<typeof archiveProgramCommandSchema>) {return post(`${root(programId)}/archive`,adminProgramSchema,input,archiveProgramCommandSchema);}
 async rollback(programId:string,input:z.infer<typeof rollbackProgramCommandSchema>) {return post(`${root(programId)}/rollback`,programVersionResponseSchema,input,rollbackProgramCommandSchema);}
 async duplicate(programId:string,input:z.infer<typeof duplicateProgramCommandSchema>) {return post(`${root(programId)}/duplicate`,adminProgramSchema,input,duplicateProgramCommandSchema);}
 async enrollments(programId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${root(programId)}/enrollments?${page(paging)}`,programEnrollmentListSchema);}
 async assign(programId:string,input:AssignProgramEnrollmentInput) {return post(`${root(programId)}/enrollments`,programEnrollmentSchema,input,assignProgramEnrollmentSchema);}
 async enrollmentTransition(programId:string,enrollmentId:string,input:ProgramEnrollmentTransitionInput) {return post(`${root(programId)}/enrollments/${id(enrollmentId)}/transition`,programEnrollmentSchema,input,programEnrollmentTransitionSchema);}
 async enrollmentHistory(programId:string,enrollmentId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${root(programId)}/enrollments/${id(enrollmentId)}/history?${page(paging)}`,enrollmentHistorySchema);}
 async analytics(programId:string,input:ProgramAnalyticsQuery) {return ieltsRequest(`${root(programId)}/analytics?${query(programAnalyticsQuerySchema,input)}`,programAnalyticsSchema);}
 async enrollmentsMine(paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`/me/program-enrollments?${page(paging)}`,programEnrollmentListSchema);}
 async progress(enrollmentId:string) {return ieltsRequest(`${mine(enrollmentId)}/progress`,programProgressSchema);}
 async history(enrollmentId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${mine(enrollmentId)}/history?${page(paging)}`,programProgressHistorySchema);}
 async reviews(enrollmentId:string,paging:Partial<ProgramPageInput>={}) {return ieltsRequest(`${mine(enrollmentId)}/reviews?${page(paging)}`,programReviewsSchema);}
 async recalculate(enrollmentId:string,input:z.infer<typeof programRecalculateSchema>) {return post(`${mine(enrollmentId)}/recalculate`,programProgressSchema,input,programRecalculateSchema);}
 async completeReview(enrollmentId:string,reviewId:string,input:z.infer<typeof completeProgramReviewSchema>) {return post(`${mine(enrollmentId)}/reviews/${id(reviewId)}/complete`,programProgressSchema,input,completeProgramReviewSchema);}
}
export const programPlatformClient=new ProgramPlatformClient();
