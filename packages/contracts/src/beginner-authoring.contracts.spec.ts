import { describe,it,expect } from 'vitest';
import * as contract from './beginner-authoring.contracts.ts';
const target={programId:'10000000-0000-4000-8000-000000000001',pathId:'10000000-0000-4000-8000-000000000002',levelId:'10000000-0000-4000-8000-000000000003',missionId:'10000000-0000-4000-8000-000000000004'};
describe('Beginner authoring boundary',()=>{
 it('rejects caller-supplied authority and inconsistent hierarchy',()=>{
  expect(contract.beginnerTargetSchema.safeParse({...target,context:{approved:true}}).success).toBe(false);
  expect(contract.beginnerTargetSchema.safeParse({programId:target.programId,missionId:target.missionId}).success).toBe(false);
  expect(contract.beginnerTargetSchema.safeParse(target).success).toBe(true);
 });
 it('never upgrades fixture content readiness',()=>{
  expect(contract.beginnerReleaseEnvelopeSchema.safeParse({fixtureOnly:true,contentReadiness:'CONTENT_READY'}).success).toBe(false);
 });
});

describe('explicit controlled-main permission v2',()=>{
 const record=()=>({schemaVersion:2,mode:'CONTROLLED_MAIN_DB',approvalId:'main-261026a00003',mandateId:'MND-20261024-003',proposalHash:'1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49',environmentId:'main-261026a00003',runId:'261026a00003',programId:target.programId,database:{host:'127.0.0.1',port:55432,name:'worklingo',role:'wl_r12a_main_202610260003',serverIdentity:'7692646346822291490',databaseOid:'16384',roleOid:'40000',clusterName:''},storageRoot:'C:/run/storage',registryRoot:'C:/run/registry',approvalRoot:'C:/run/approval',ownedTempRoot:'C:/run',issuedAt:'2030-01-01T00:00:00.000Z',expiresAt:'2030-01-01T04:00:00.000Z',actions:['read','author','validate','review','publish','export','fixture-audio','cleanup'],revoked:false,approvedBy:'WorkLingo product owner (human user)',authorizationSource:'mandate/reports/2026-10-26-beginner-main-db-human-approval.md',execution:{mandateId:'MND-20261026-003',proposalHash:'280ea7a31e34e1649584bfdcf0f26fd6ead3f6dfdc7d4932434519071f761f17',scopeHash:'23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b',manifestPath:'C:/run/approval/execution.json',manifestHash:'a'.repeat(64)},recordHash:'b'.repeat(64)});
 it('accepts only the exact main target while preserving a separate version',()=>{
  expect(contract.beginnerPermissionSchema.safeParse(record()).success).toBe(true);
  for(const change of [{schemaVersion:1},{mode:'ISOLATED_TEST'},{runId:'abcdef123456'}])expect(contract.beginnerPermissionSchema.safeParse({...record(),...change}).success).toBe(false);
  for(const change of [{name:'other'},{role:'worklingo'},{port:5432},{serverIdentity:'wrong'}])expect(contract.beginnerPermissionSchema.safeParse({...record(),database:{...record().database,...change}}).success).toBe(false);
 });
 it('never grants schema application or release approval to main fixtures',()=>{
  for(const action of ['approve-release','schema-setup'])expect(contract.beginnerPermissionSchema.safeParse({...record(),actions:['read',action]}).success).toBe(false);
  expect(contract.beginnerPermissionSchema.safeParse({...record(),execution:{...record().execution,proposalHash:'f'.repeat(64)}}).success).toBe(false);
 });
});
