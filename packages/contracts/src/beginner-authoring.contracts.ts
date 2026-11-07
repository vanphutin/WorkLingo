import { z } from 'zod';
import { beginnerManifestSchema } from './beginner.contracts.ts';

const id=z.uuid(), hash=z.string().regex(/^[a-f0-9]{64}$/u);
export const beginnerTargetSchema=z.object({
 programId:id,pathId:id.optional(),levelId:id.optional(),missionId:id.optional(),lessonId:id.optional(),importId:id.optional()
}).strict().superRefine((v,c)=>{
 if((v.levelId&&!v.pathId)||(v.missionId&&!v.levelId)||((v.lessonId||v.importId)&&!v.missionId))c.addIssue({code:'custom',message:'Incomplete Beginner hierarchy'});
});
export type BeginnerTarget=z.infer<typeof beginnerTargetSchema>;
export const beginnerActionSchema=z.enum(['read','author','validate','review','publish','export','approve-release','schema-setup','fixture-audio','cleanup']);
export type BeginnerAction=z.infer<typeof beginnerActionSchema>;
const beginnerPermissionV1Schema=z.object({
 schemaVersion:z.literal(1),approvalId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u),
 mandateId:z.literal('MND-20261024-003'),proposalHash:z.literal('1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49'),
 environmentId:z.string().min(1).max(100),runId:z.string().regex(/^[a-f0-9]{12}$/u),programId:id,
 database:z.object({host:z.enum(['127.0.0.1','::1']),port:z.number().int().min(1).max(65535),name:z.string().min(1),role:z.string().min(1),serverIdentity:z.string().min(1)}).strict(),
 storageRoot:z.string().min(1),registryRoot:z.string().min(1),approvalRoot:z.string().min(1),ownedTempRoot:z.string().min(1),
 actions:z.array(beginnerActionSchema).min(1),expiresAt:z.iso.datetime(),revoked:z.literal(false),
 approvedBy:z.string().min(1),authorizationSource:z.string().min(1),recordHash:hash
}).strict();
export const beginnerMainBinding={
 mandateId:'MND-20261026-003',
 proposalHash:'280ea7a31e34e1649584bfdcf0f26fd6ead3f6dfdc7d4932434519071f761f17',
 scopeHash:'23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b',
 runId:'261026a00003',role:'wl_r12a_main_202610260003',systemIdentifier:'7692646346822291490',
} as const;
const beginnerPermissionV2Schema=beginnerPermissionV1Schema.extend({
 schemaVersion:z.literal(2),mode:z.literal('CONTROLLED_MAIN_DB'),runId:z.literal(beginnerMainBinding.runId),issuedAt:z.iso.datetime(),
 database:beginnerPermissionV1Schema.shape.database.extend({host:z.literal('127.0.0.1'),port:z.literal(55432),name:z.literal('worklingo'),role:z.literal(beginnerMainBinding.role),serverIdentity:z.literal(beginnerMainBinding.systemIdentifier),databaseOid:z.literal('16384'),roleOid:z.string().regex(/^[1-9]\d*$/u),clusterName:z.literal('')}),
 execution:z.object({mandateId:z.literal(beginnerMainBinding.mandateId),proposalHash:z.literal(beginnerMainBinding.proposalHash),scopeHash:z.literal(beginnerMainBinding.scopeHash),manifestPath:z.string().min(1),manifestHash:hash}).strict(),
}).strict().superRefine((v,c)=>{
 if(v.actions.some(a=>a==='approve-release'||a==='schema-setup'))c.addIssue({code:'custom',message:'Controlled main tests cannot grant release/schema authority'});
});
// Operator-owned R2 program admission is distinct from historical fixture authority.
export const beginnerProgramImportPermissionSchema=z.object({
 schemaVersion:z.literal(3),mode:z.literal('PROGRAM_IMPORT'),approvalId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u),
 environmentId:z.string().min(1).max(100),runId:z.string().regex(/^[a-f0-9]{12}$/u),programId:id,
 database:beginnerPermissionV1Schema.shape.database,
 storageRoot:z.string().min(1),registryRoot:z.string().min(1),approvalRoot:z.string().min(1),ownedTempRoot:z.string().min(1),
 actions:z.array(z.enum(['read','author','validate','review','publish'])).min(1),
 issuedAt:z.iso.datetime(),expiresAt:z.iso.datetime(),revoked:z.literal(false),
 approvedBy:z.string().min(1),authorizationSource:z.string().min(1),
 sourceInventoryHash:hash,backupHash:hash,dryRunHash:hash,recordHash:hash,
}).strict();
export const beginnerPermissionSchema=z.union([beginnerPermissionV1Schema,beginnerPermissionV2Schema,beginnerProgramImportPermissionSchema]);
export type BeginnerPermission=z.infer<typeof beginnerPermissionSchema>;
export const beginnerReleaseEnvelopeSchema=z.object({
 schemaVersion:z.literal(1),state:z.enum(['TEST_PUBLISHED','APPROVED_RELEASE']),
 environmentId:z.string().min(1).max(100),releaseId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u),
 fixtureOnly:z.literal(true),contentReadiness:z.literal('FIXTURE_ONLY'),manifest:beginnerManifestSchema,
 curriculumSnapshots:z.array(z.object({curriculumRevisionId:id,snapshotHash:hash}).strict()).min(1),
 snapshots:z.array(z.object({lessonVersionId:id,sourceHash:hash,snapshotHash:hash}).strict()).min(1),
 assets:z.array(z.object({id:id,key:z.string().min(1),sha256:hash,scriptHash:hash}).strict()).min(1),
 receipts:z.array(z.object({id:id,operation:z.string().min(1),requestHash:hash}).strict()).min(1),
 reviewReferences:z.array(id).min(1),approvalRef:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u).nullable(),candidateHash:hash
}).strict().superRefine((v,c)=>{
 const revisions=v.manifest.stages.flatMap(s=>s.units.map(u=>u.curriculumRevisionId));
 if(new Set(v.curriculumSnapshots.map(s=>s.curriculumRevisionId)).size!==v.curriculumSnapshots.length||revisions.length!==v.curriculumSnapshots.length||revisions.some(id=>!v.curriculumSnapshots.some(s=>s.curriculumRevisionId===id)))c.addIssue({code:'custom',message:'Curriculum snapshot membership mismatch'});
 const ids=v.manifest.stages.flatMap(s=>s.units.flatMap(u=>u.lessons.map(l=>l.lessonVersionId)));
 if(v.releaseId!==v.manifest.releaseId||new Set(v.snapshots.map(s=>s.lessonVersionId)).size!==v.snapshots.length||ids.length!==v.snapshots.length||ids.some(id=>!v.snapshots.some(s=>s.lessonVersionId===id)))c.addIssue({code:'custom',message:'Release membership mismatch'});
 if(v.state==='APPROVED_RELEASE'&&!v.approvalRef)c.addIssue({code:'custom',message:'Explicit candidate approval required'});
});
export type BeginnerReleaseEnvelope=z.infer<typeof beginnerReleaseEnvelopeSchema>;
export const beginnerWriteSchema=z.object({
 target:beginnerTargetSchema,editorialCode:z.string().regex(/^(?:MG|CB)\d{2}-L[1-4]$/u).optional(),expectedRevision:z.number().int().positive().nullable(),
 rawSource:z.string().min(1).max(500000).optional(),idempotencyKey:z.string().min(1).max(100),
 expectedSourceHash:hash.optional(),reviewHash:hash.optional(),
 selectedAudioArtifacts:z.record(z.string(),id).default({})
}).strict();
export type BeginnerWriteInput=z.infer<typeof beginnerWriteSchema>;
