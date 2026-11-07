import { createHash } from 'node:crypto';
import type { BeginnerPermission } from '@worklingo/contracts';
export const fixtureActor={id:'10000000-0000-4000-8000-000000000010',roles:['CONTENT_ADMIN']};
export const fixtureTarget={programId:'10000000-0000-4000-8000-000000000001',pathId:'10000000-0000-4000-8000-000000000002',levelId:'10000000-0000-4000-8000-000000000003',missionId:'10000000-0000-4000-8000-000000000004'};
function sorted(v:unknown):unknown{return Array.isArray(v)?v.map(sorted):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted((v as Record<string,unknown>)[k])])):v;}
export function fixturePermission():Extract<BeginnerPermission,{schemaVersion:1}> {
 const record={schemaVersion:1 as const,approvalId:'synthetic-unit-grant',mandateId:'MND-20261024-003' as const,proposalHash:'1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49' as const,environmentId:'synthetic-unit',runId:'abcdef123456',programId:fixtureTarget.programId,database:{host:'127.0.0.1' as const,port:5432,name:'worklingo_beginner_r12a_abcdef123456',role:'wl_beginner_abcdef123456',serverIdentity:'synthetic-cluster'},ownedTempRoot:'/tmp/wl-synthetic',storageRoot:'/tmp/wl-synthetic/abcdef123456/audio',registryRoot:'/tmp/wl-synthetic/abcdef123456/registry',approvalRoot:'/operator-approvals',actions:['read','author','validate','review','publish','export','approve-release'] as BeginnerPermission['actions'],expiresAt:'2099-01-01T00:00:00.000Z',revoked:false as const,approvedBy:'Synthetic operator, unit tests only',authorizationSource:'synthetic-fixture-not-human-approval'};
 return {...record,recordHash:createHash('sha256').update(JSON.stringify(sorted(record))).digest('hex')};
}

import {foundationLessonSource} from '@worklingo/test-fixtures';
export function syntheticBeginnerSource():string {
 let source=foundationLessonSource.replace('WorkLingoLesson/1.1','WorkLingoLesson/1.2').replace('duration_minutes: 60','duration_minutes: 45').replace('learning_block: activate','learning_block: respond')
 .replace('response_type: shadowing','response_type: guided_response')
 .replace(/(response_type: (?:guided_response|short_text))/gu,'$1\nmin_words: 1\nsample_answer: Synthetic unit response\nrubric_version: 1')
 .replace('response_type: guided_response','response_type: guided_response\nrubric_id: beginner-guided-speaking')
 .replace('response_type: short_text','response_type: short_text\nrubric_id: beginner-short-writing');
 const sections=[...source.matchAll(/\[ACTIVITY ([^\]]+)\][\s\S]*?\[\/ACTIVITY\]/gu)];
 for(const type of ['reading','listening']){
  const originals=sections.filter(m=>m[0].includes('activity_type: '+type));
  for(let n=originals.length;n<3;n++){const m=originals[0]!;source+='\n'+m[0].replace('[ACTIVITY '+m[1]+']','[ACTIVITY '+m[1]+'-fixture-'+n+']')+'\n';}
 }
 return source+'\n[INSTRUCTION unit-guide]\nphase: readDecode\norder: 0\ntext: Read the example, then answer with different information.\n[/INSTRUCTION]\n';
}
