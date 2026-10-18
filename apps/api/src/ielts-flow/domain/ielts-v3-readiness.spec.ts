import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/database/prisma.service.js';
import { readIeltsV3Readiness } from './ielts-v3-readiness.js';

it('keeps readiness independent when only one current topic is usable', async () => {
  const qualify=vi.fn().mockResolvedValue({canPublish:true});
  const db={ieltsOrientation:{findUnique:vi.fn().mockResolvedValue(null)},ieltsTopic:{findMany:vi.fn().mockResolvedValue([{id:'topic',status:'PUBLISHED',currentPublishedVersionId:'version',currentPublishedVersion:{id:'version',status:'PUBLISHED',archivedAt:null,content:{}}}])},ieltsMockTest:{findMany:vi.fn().mockResolvedValue([])}};
  expect(await readIeltsV3Readiness(db as unknown as PrismaService,{qualify})).toMatchObject({introduction:false,study:true,mock:false,ready:true});
  expect(qualify).toHaveBeenCalledOnce();
});

it('admits a published practice-only V1 paper without simulation qualification',async()=>{const paper={...INITIAL_IELTS_ACADEMIC_MOCK,allowedModes:['PRACTICE'],listening:{...INITIAL_IELTS_ACADEMIC_MOCK.listening,parts:INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map(part=>({...part,audioAssetId:crypto.randomUUID()}))}};const db={ieltsOrientation:{findUnique:vi.fn().mockResolvedValue(null)},ieltsTopic:{findMany:vi.fn().mockResolvedValue([])},ieltsMockTest:{findMany:vi.fn().mockResolvedValue([{currentPublishedVersion:{content:paper}}])},audioArtifact:{count:vi.fn().mockResolvedValue(4)}};expect(await readIeltsV3Readiness(db as unknown as PrismaService,{qualify:vi.fn()})).toMatchObject({mock:true,ready:true});});
