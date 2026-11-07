import { assessmentResultSchema, type AssessmentResult } from '@worklingo/contracts';
import { z } from 'zod';
import { ApiError } from './api-client';
const historySchema=z.object({items:z.array(assessmentResultSchema),audit:z.array(z.unknown()).optional()});
const masterySchema=z.object({skills:z.array(z.object({skill:z.enum(['reading','listening','speaking','writing']),observations:z.number().int().nonnegative(),score:z.number().min(0).max(100).nullable(),confidence:z.enum(['HIGH','MEDIUM','LOW','UNKNOWN']),gaps:z.array(z.string()),recommendation:z.string()})),disclosure:z.string()});
export type AssessmentMasteryResult=z.infer<typeof masterySchema>;
export class AssessmentClient {
 private readonly requestKeys=new Map<string,string>();
 constructor(private readonly baseUrl=process.env.NEXT_PUBLIC_API_BASE_URL??'/api/v1'){}
 private async request<T>(path:string,schema:z.ZodType<T>,options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch(`${this.baseUrl.replace(/\/+$/u,'')}${path}`,{credentials:'include',cache:'no-store',method:'GET',...options,headers:{'content-type':'application/json'}});}catch{throw new ApiError({code:'NETWORK_ERROR',message:'Unable to reach assessment service.',status:0});}
  if(!response.ok)throw new ApiError({code:'ASSESSMENT_ERROR',message:'Assessment request failed.',status:response.status});
  return schema.parse(await response.json());
 }
 history(attemptId:string,admin=false){return this.request(admin?`/admin/assessments?attemptId=${encodeURIComponent(attemptId)}`:`/attempts/${encodeURIComponent(attemptId)}/assessments`,historySchema);}
 async evaluate(attemptId:string,previousEvaluationId?:string,admin=false):Promise<AssessmentResult>{
  const scope=`${admin}:${attemptId}:${previousEvaluationId??''}`;
  const key=this.requestKeys.get(scope)??crypto.randomUUID();this.requestKeys.set(scope,key);
  const result=await this.request(`${admin?'/admin':''}/attempts/${encodeURIComponent(attemptId)}/assessments`,assessmentResultSchema,{method:'POST',body:JSON.stringify({idempotencyKey:key,...(previousEvaluationId?{previousEvaluationId}:{})})});
  this.requestKeys.delete(scope);return result;
 }
 cancel(id:string){return this.request(`/assessments/${encodeURIComponent(id)}/cancel`,assessmentResultSchema,{method:'POST'});}
 mastery(){return this.request('/me/assessment-mastery',masterySchema);}
}
export const assessmentClient=new AssessmentClient();
