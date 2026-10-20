import { expect, it } from 'vitest';
import { assertIeltsV3Review, parseIeltsV3ReleaseOptions, assertIeltsV3LocalTarget } from './release-policy.js';
import { releaseHash } from './release-content.js';
it('fingerprints JSON values consistently across PostgreSQL object-key ordering',()=>{expect(releaseHash({b:2,a:{d:4,c:3}})).toBe(releaseHash({a:{c:3,d:4},b:2}));});
it('defaults to read-only and requires an exact reviewed fingerprint for execute',()=>{
  expect(parseIeltsV3ReleaseOptions([])).toEqual({execute:false,expect:null});
  expect(()=>parseIeltsV3ReleaseOptions(['--execute'])).toThrow();
  expect(()=>parseIeltsV3ReleaseOptions(['--force'])).toThrow();
  expect(parseIeltsV3ReleaseOptions(['--execute','--expect='+'a'.repeat(64)])).toMatchObject({execute:true});
});
it('does not mistake a declaration or an old audio audition for completed content qualification',()=>{
  expect(()=>assertIeltsV3Review({status:'AWAITING_REVIEW'},'a'.repeat(64))).toThrow();
  const review={status:'QUALIFIED',contentReviewer:{name:'Independent reviewer',evidenceRevision:'academic-02-original-v1'},audioAudition:{name:'Local reviewer',kind:'human',reviewedAt:new Date().toISOString(),sourceFingerprint:'a'.repeat(64)}};
  expect(()=>assertIeltsV3Review(review,'a'.repeat(64))).not.toThrow();
  expect(()=>assertIeltsV3Review(review,'b'.repeat(64))).toThrow();
});
it('rejects remote databases and unrelated storage before any release writes',()=>{
  expect(()=>assertIeltsV3LocalTarget('postgresql://user:pass@example.com:55432/worklingo','D:/Projects/WorkLingo/apps/api/data')).toThrow();
  expect(()=>assertIeltsV3LocalTarget('postgresql://user:pass@127.0.0.1:55432/worklingo?schema=public','D:/Projects/Other/data')).toThrow();
  expect(()=>assertIeltsV3LocalTarget('postgresql://user:pass@127.0.0.1:55432/worklingo?schema=public','D:/Projects/WorkLingo/apps/api/data')).not.toThrow();
});
