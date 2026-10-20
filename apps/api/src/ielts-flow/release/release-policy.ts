import path from 'node:path';
import { z } from 'zod';
import { assertLocalDatabase } from '../../ielts-beta-release/safety.js';
export const localIeltsStorage='D:/Projects/WorkLingo/apps/api/data';
export function assertIeltsV3LocalTarget(databaseUrl:string,storageRoot:string) {assertLocalDatabase(databaseUrl);if(path.resolve(storageRoot).toLowerCase()!==path.resolve(localIeltsStorage).toLowerCase())throw new Error('Expected the existing local WorkLingo storage directory.');}
export function parseIeltsV3ReleaseOptions(args:string[]) {
  if(args.some(arg=>arg!=='--execute'&&!/^--expect=[a-f0-9]{64}$/u.test(arg))||new Set(args).size!==args.length||args.filter(arg=>arg.startsWith('--expect=')).length>1)throw new Error('Use only --execute and --expect=<reviewed fingerprint>.');
  const execute=args.includes('--execute'),expect=args.find(arg=>arg.startsWith('--expect='))?.slice(9)??null;
  if(execute&&!expect)throw new Error('Execute requires the reviewed dry-run fingerprint.');return {execute,expect};
}
const reviewSchema=z.object({status:z.literal('QUALIFIED'),contentReviewer:z.object({name:z.string().min(3),evidenceRevision:z.literal('academic-02-original-v1')}),audioAudition:z.object({name:z.string().min(3),kind:z.literal('human'),reviewedAt:z.iso.datetime(),sourceFingerprint:z.string().regex(/^[a-f0-9]{64}$/u)})});
export function assertIeltsV3Review(value:unknown,fingerprint:string) {const review=reviewSchema.safeParse(value);if(!review.success||review.data.audioAudition.sourceFingerprint!==fingerprint)throw new Error('Exact source/content review and actual human audio audition are still required before final simulation release.');return review.data;}
