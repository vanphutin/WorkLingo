import {describe,it,expect,vi} from 'vitest';
import type {Prisma} from '@prisma/client';
import {resolve} from 'node:path';
import {loadBeginnerVocabularyEvidence,verifyBeginnerVocabularyEvidence} from './beginner-vocabulary-evidence.js';
const evidence=loadBeginnerVocabularyEvidence(resolve(__dirname,'../../../../..'));
const tables={sources:'vocabularySource',documents:'vocabularyDocument',entries:'lexicalEntry',senses:'lexicalSense',pronunciations:'lexicalPronunciation',cefr:'lexicalCefrAssociation',occurrences:'vocabularySourceEntry'} as const;
function fixture(){
 const rows=structuredClone(evidence.snapshot);
 const database=Object.fromEntries(Object.entries(tables).map(([key,model])=>[model,{findMany:vi.fn(async({where}:{where:{id?:{in:string[]};lexicalEntryId?:{in:string[]}}})=>rows[key as keyof typeof tables].filter(row=>where.id?.in.includes(String(row.id))||where.lexicalEntryId?.in.includes(String(row.lexicalEntryId))))}]));
 return {rows,tx:database as unknown as Prisma.TransactionClient};
}
describe('exact admitted Beginner vocabulary evidence',()=>{
 it('accepts unchanged actual provenance without any master writes',async()=>{const {tx}=fixture();await expect(verifyBeginnerVocabularyEvidence(tx,evidence,evidence.snapshot.mapping)).resolves.toBeUndefined();});
 it.each([['senses','definition','Changed contextual definition'],['pronunciations','ipa','/changed/'],['cefr','cefrLevel','B1'],['documents','sha256','changed'],['sources','rightsStatus','REVOKED'],['occurrences','sourceContentHash','changed']] as const)('rejects %s %s drift',async(table,key,value)=>{const {rows,tx}=fixture();rows[table][0]![key]=value;await expect(verifyBeginnerVocabularyEvidence(tx,evidence,evidence.snapshot.mapping)).rejects.toThrow('BEGINNER_VOCABULARY_DRIFT');});
 it('rejects added CEFR associations and missing exact senses',async()=>{const {rows,tx}=fixture();rows.cefr.push({...rows.cefr[0],id:'unexpected-association',cefrLevel:'B1'});await expect(verifyBeginnerVocabularyEvidence(tx,evidence,evidence.snapshot.mapping)).rejects.toThrow('BEGINNER_VOCABULARY_DRIFT');rows.cefr.pop();rows.senses.pop();await expect(verifyBeginnerVocabularyEvidence(tx,evidence,evidence.snapshot.mapping)).rejects.toThrow('BEGINNER_VOCABULARY_DRIFT');});
 it('rejects changing a component-only relationship into an exact admission',async()=>{const {tx}=fixture();const mappings=structuredClone(evidence.snapshot.mapping);mappings.find(row=>row.relationship==='HEADWORD_COMPONENT_ONLY')!.relationship='CONTEXTUAL_SENSE_MATCH';await expect(verifyBeginnerVocabularyEvidence(tx,evidence,mappings)).rejects.toThrow('BEGINNER_VOCABULARY_MAPPING_CHANGED');});
});
