import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {Prisma} from '@prisma/client';
import type {BeginnerVocabularyMapping} from './beginner-program-source.js';
type EvidenceRow=Record<string,unknown>;
export interface BeginnerVocabularyEvidence {
 sha256:string;
 snapshot:{sources:EvidenceRow[];documents:EvidenceRow[];entries:EvidenceRow[];senses:EvidenceRow[];pronunciations:EvidenceRow[];cefr:EvidenceRow[];occurrences:EvidenceRow[];mapping:BeginnerVocabularyMapping[]};
}
export function loadBeginnerVocabularyEvidence(root:string):BeginnerVocabularyEvidence{
 const bytes=readFileSync(path.join(root,'docs/qualification/beginner-pilot-vocabulary-provenance.json'),'utf8').replace(/\r\n/gu,'\n');
 return {sha256:createHash('sha256').update(bytes).digest('hex'),snapshot:JSON.parse(bytes) as BeginnerVocabularyEvidence['snapshot']};
}
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';
 return JSON.stringify(value);
}
function compareRows(expected:EvidenceRow[],actual:unknown[]):void{
 if(!expected.length||new Set(expected.map(row=>row.id)).size!==expected.length||actual.length!==expected.length)throw new Error('BEGINNER_VOCABULARY_DRIFT');
 for(const row of expected){
  const current=actual.find(value=>(value as EvidenceRow).id===row.id) as EvidenceRow|undefined;
  if(!current||canonical(row)!==canonical(Object.fromEntries(Object.keys(row).map(key=>[key,current[key]]))))throw new Error('BEGINNER_VOCABULARY_DRIFT');
 }
}
/** Bounded read-only revalidation of the pinned primary evidence, including component exceptions. */
export async function verifyBeginnerVocabularyEvidence(tx:Prisma.TransactionClient,evidence:BeginnerVocabularyEvidence,mappings:readonly BeginnerVocabularyMapping[]):Promise<void>{
 const expected=evidence.snapshot;
 const admitted=mappings.filter(row=>row.relationship==='CONTEXTUAL_SENSE_MATCH');
 if(expected.mapping.length!==41||mappings.length!==41||admitted.length!==20||canonical([...mappings].sort((a,b)=>a.pilotId.localeCompare(b.pilotId)))!==canonical([...expected.mapping].sort((a,b)=>a.pilotId.localeCompare(b.pilotId))))throw new Error('BEGINNER_VOCABULARY_MAPPING_CHANGED');
 const entryIds=expected.entries.map(row=>String(row.id));
 for(const mapping of admitted){
  const entry=expected.entries.find(row=>row.id===mapping.lexicalEntryId);
  if(!entry||entry.normalizedForm!==mapping.expression.toLowerCase()||!mapping.senseIds.length||mapping.senseIds.some(id=>!expected.senses.some(row=>row.id===id&&row.lexicalEntryId===mapping.lexicalEntryId)))throw new Error('BEGINNER_VOCABULARY_MAPPING_CHANGED');
  const cefr=expected.cefr.filter(row=>row.lexicalEntryId===mapping.lexicalEntryId&&(row.senseId===null||mapping.senseIds.includes(String(row.senseId)))).map(row=>String(row.cefrLevel));
  if(canonical([...new Set(cefr)].sort())!==canonical([...mapping.masterCefr].sort())||cefr.some(level=>!['A1','A2'].includes(level)))throw new Error('BEGINNER_VOCABULARY_MAPPING_CHANGED');
 }
 const byIds=(rows:EvidenceRow[])=>({id:{in:rows.map(row=>String(row.id))}});
 const actual=await Promise.all([
  tx.vocabularySource.findMany({where:byIds(expected.sources)}),
  tx.vocabularyDocument.findMany({where:byIds(expected.documents)}),
  tx.lexicalEntry.findMany({where:byIds(expected.entries)}),
  tx.lexicalSense.findMany({where:byIds(expected.senses)}),
  tx.lexicalPronunciation.findMany({where:{lexicalEntryId:{in:entryIds}}}),
  tx.lexicalCefrAssociation.findMany({where:{lexicalEntryId:{in:entryIds}}}),
  tx.vocabularySourceEntry.findMany({where:byIds(expected.occurrences)}),
 ]);
 const expectedRows=[expected.sources,expected.documents,expected.entries,expected.senses,expected.pronunciations,expected.cefr,expected.occurrences];
 expectedRows.forEach((rows,index)=>compareRows(rows,actual[index]!));
}
