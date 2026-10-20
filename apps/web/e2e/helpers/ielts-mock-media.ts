import { expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import type { PrismaClient, Prisma } from '../../../api/node_modules/@prisma/client';
import { publishIeltsStudyFixture } from './ielts-study';

/** Transport-only content in the guarded disposable schema; never release qualification. */
export async function publishMockMediaFixture(baseURL: string): Promise<string> {
  await publishIeltsStudyFixture(baseURL); // validates schema, origin, storage and loopback target first
  const apiRequire = createRequire(path.resolve(__dirname, '../../../api/package.json'));
  const { PrismaClient: Client } = apiRequire('@prisma/client') as { PrismaClient: typeof PrismaClient };
  const database = new Client({ datasourceUrl: process.env.WORKLINGO_E2E_DATABASE_URL! });
  try {
    const prior = await database.ieltsMockTest.findUnique({ where: { slug: 'ielts-media-e2e-fixture' } });
    if (prior) return prior.id;
    const size = 16000 * 2;
    const body = Buffer.alloc(44 + size); body.write('RIFF'); body.writeUInt32LE(size + 36, 4); body.write('WAVE', 8); body.write('fmt ', 12); body.writeUInt32LE(16, 16); body.writeUInt16LE(1, 20); body.writeUInt16LE(1, 22); body.writeUInt32LE(16000, 24); body.writeUInt32LE(32000, 28); body.writeUInt16LE(2, 32); body.writeUInt16LE(16, 34); body.write('data', 36); body.writeUInt32LE(size, 40);
    for (let i = 0; i < size / 2; i++) body.writeInt16LE(Math.round(1200 * Math.sin(i * Math.PI / 20)), 44 + i * 2);
    const content = { ...structuredClone(INITIAL_IELTS_ACADEMIC_MOCK), schemaVersion: 2, allowedModes: ['PRACTICE','EXAM_SIMULATION'], qualification: { reviewedBy: 'Disposable browser transport fixture', reviewedAt: new Date().toISOString(), evidenceRevision: 'e2e-only', qualifiedModes: ['PRACTICE','EXAM_SIMULATION'] } };
    content.writing=JSON.parse(await readFile(path.resolve(__dirname,'../../../../content/ielts/mocks/academic-02/paper.json'),'utf8')).writing;
    for (const part of content.listening.parts) {
      const key = `ielts-e2e/${randomUUID()}.wav`;
      await mkdir(path.join(process.env.WORKLINGO_E2E_DATA_DIR!, 'ielts-e2e'), { recursive: true });
      await writeFile(path.join(process.env.WORKLINGO_E2E_DATA_DIR!, key), body);
      const artifact = await database.audioArtifact.create({ data: { audioScriptSlug: `e2e-part-${part.part}`, scriptHash: randomUUID(), adapterName: 'isolated-fixture', voiceConfig: { provenance: 'Transport-only fixture' }, mimeType: 'audio/wav', byteSize: body.length, checksum: createHash('sha256').update(body).digest('hex'), storageKey: key, status: 'READY' } });
      part.audioAssetId = artifact.id;
    }
    const mock = await database.ieltsMockTest.create({ data: { slug: 'ielts-media-e2e-fixture', status: 'PUBLISHED', draftContent: content as unknown as Prisma.InputJsonValue } });
    const version = await database.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 1, sourceHash: randomUUID(), content: content as unknown as Prisma.InputJsonValue } });
    await database.ieltsMockTest.update({ where: { id: mock.id }, data: { currentPublishedVersionId: version.id } });
    return mock.id;
  } finally { await database.$disconnect(); }
}

export async function expireOwnedMockFixture(baseURL:string,attemptId:string,learnerId:string) {
  await publishIeltsStudyFixture(baseURL); // exact disposable target guards
  const apiRequire=createRequire(path.resolve(__dirname,'../../../api/package.json'));
  const {PrismaClient:Client}=apiRequire('@prisma/client') as {PrismaClient:typeof PrismaClient};
  const database=new Client({datasourceUrl:process.env.WORKLINGO_E2E_DATABASE_URL!});
  try {expect((await database.ieltsMockAttempt.updateMany({where:{id:attemptId,learnerId,mockTestVersion:{mockTest:{slug:'ielts-media-e2e-fixture'}},policyVersion:'v2',mode:'EXAM_SIMULATION',currentSection:'LISTENING'},data:{sectionDeadlineAt:new Date(Date.now()-1000)}})).count).toBe(1);}finally{await database.$disconnect();}
}
