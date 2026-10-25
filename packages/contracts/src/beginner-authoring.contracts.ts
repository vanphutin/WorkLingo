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
export const beginnerPermissionSchema=z.object({
 schemaVersion:z.literal(1),approvalId:z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/u),
 mandateId:z.literal('MND-20261024-003'),proposalHash:z.literal('1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49'),
 environmentId:z.string().min(1).max(100),runId:z.string().regex(/^[a-f0-9]{12}$/u),programId:id,
 database:z.object({host:z.enum(['127.0.0.1','::1']),port:z.number().int().min(1).max(65535),name:z.string().min(1),role:z.string().min(1),serverIdentity:z.string().min(1)}).strict(),
 storageRoot:z.string().min(1),registryRoot:z.string().min(1),approvalRoot:z.string().min(1),ownedTempRoot:z.string().min(1),
 actions:z.array(beginnerActionSchema).min(1),expiresAt:z.iso.datetime(),revoked:z.literal(false),
 approvedBy:z.string().min(1),authorizationSource:z.string().min(1),recordHash:hash
}).strict();
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
