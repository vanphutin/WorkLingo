export interface JourneyBinding{lesson:string;sessionId:string;lessonVersionId:string;activityIds:string[]}
export interface BrowserReceipt{kind:string;sessionId:string;lessonVersionId:string;activityId?:string;at:number;status:number}
export function collectJourney(binding:JourneyBinding,input:unknown[]){
 const uuid=(s:string)=>/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/u.test(s);
 if(!/^MG0[12]-L[1-4]$/u.test(binding.lesson)||!uuid(binding.sessionId)||!uuid(binding.lessonVersionId)||!binding.activityIds.length||binding.activityIds.some(id=>!uuid(id))||new Set(binding.activityIds).size!==binding.activityIds.length)throw Error('BROWSER_BINDING_INVALID');
 let last=0,index=0,completed=false,abandoned=false,mode:'active'|'wait'|'support'='active';const failures:BrowserReceipt[]=[];const timingMilliseconds={active:0,wait:0,support:0};
 for(const value of input){const e=value as BrowserReceipt;
  if(!e||Object.keys(e).some(k=>!['kind','sessionId','lessonVersionId','activityId','at','status'].includes(k))||!['activity','complete','error','wait','active','support','retry','pause','resume','audio','help','abandon'].includes(e.kind)||e.sessionId!==binding.sessionId||e.lessonVersionId!==binding.lessonVersionId||!Number.isFinite(e.at)||e.at<0||e.at<last||!Number.isInteger(e.status)||e.status<100||e.status>599||completed||abandoned||(e.activityId!==undefined&&!binding.activityIds.includes(e.activityId)))throw Error('BROWSER_RECEIPT_INVALID');timingMilliseconds[mode]+=e.at-last;last=e.at;
  if(e.kind==='wait'||e.kind==='pause')mode='wait';if(e.kind==='support'||e.kind==='help')mode='support';if(e.kind==='active'||e.kind==='resume')mode='active';if(e.kind==='abandon')abandoned=true;
  if(e.kind==='activity'){if(e.activityId!==binding.activityIds[index]||e.status!==201)throw Error('BROWSER_ACTIVITY_ORDER');index++;}
  if(e.kind==='complete'){if(index!==binding.activityIds.length||e.status!==200)throw Error('BROWSER_INCOMPLETE');completed=true;}
  if(e.kind==='error'||e.status>=400)failures.push({...e});
 }
 return {provenance:'SYNTHETIC_BROWSER_REAL_API',lesson:binding.lesson,sessionId:binding.sessionId,lessonVersionId:binding.lessonVersionId,completed,abandoned,timingMilliseconds,activities:index,receipts:input.length,failures,realObservations:0,readinessChanged:false};
}
