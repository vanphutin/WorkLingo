export type Confidence = 'VERIFIED' | 'INFERRED' | 'DOCUMENTED_ONLY' | 'UNKNOWN' | 'CONFLICT';
export interface Evidence { file: string; symbol: string; lineStart: number; lineEnd: number; sha256: string }
export interface RegistryItem { id:string; kind:string; name:string; module:string; status:Confidence; description:string; evidence:Evidence[]; relatedIds:string[]; [key:string]:unknown }
export interface ModuleCoverage { module:string; name:string; discoveredFiles:number; analyzedFiles:number; verifiedItems:number; behaviorReviewed:number; analysisStatus:string }
export interface SystemRegistry { meta:{commit:string;generatedAt:string;dirty:boolean;scope:string;limitations:string[]}; inventory:{file:string;module:string;sha256:string;analysis:string}[]; items:RegistryItem[]; coverage:ModuleCoverage[] }
