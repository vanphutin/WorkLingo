import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, request } from '@playwright/test';
import { LocalObjectStorageAdapter } from '../../../api/src/storage/infrastructure/local-object-storage.adapter';
import { seedIeltsTopicCurriculum } from '../../../api/test/integration/ielts-topic-test-fixture';
import { ADMIN_CREDENTIALS } from './content-admin';

export async function publishIeltsStudyFixture(baseURL: string) {
  const schema = process.env.WORKLINGO_E2E_SCHEMA;
  const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL;
  if (!schema || !/^worklingo_e2e_[0-9a-f]{32}$/u.test(schema) || !datasourceUrl) throw new Error('IELTS study fixtures require the disposable E2E schema.');
  const url = new URL(datasourceUrl);
  if (url.searchParams.get('schema') !== schema || url.searchParams.has('options') || !['127.0.0.1', 'localhost'].includes(url.hostname) || new URL(baseURL).origin !== `http://127.0.0.1:${process.env.WORKLINGO_E2E_WEB_PORT ?? '33100'}` || path.resolve(process.env.WORKLINGO_E2E_DATA_DIR ?? '') !== path.resolve(tmpdir(), schema)) throw new Error('Refusing fixture writes outside the isolated local E2E target.');
  const apiRequire = createRequire(path.resolve(__dirname, '../../../api/package.json'));
  const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => Parameters<typeof seedIeltsTopicCurriculum>[0]['database'] };
  const database = new PrismaClient({ datasourceUrl });
  const admin = await request.newContext({ baseURL });
  try {
    const orientation=await database.ieltsOrientation.findUniqueOrThrow({where:{slug:'ielts-orientation'}});
    if(!orientation.currentPublishedVersionId){
      const content={title:'IELTS introduction',description:'Disposable navigation fixture.',slides:['What is IELTS?','Four skills','Choose your section'].map((title,index)=>({id:randomUUID(),slug:'intro-'+index,title,body:'Explore the test and choose any IELTS section independently.',transcript:'Explore the test and choose any IELTS section independently.',imageAssetId:null,audioAssetId:null,question:null}))};
      const version=await database.ieltsOrientationVersion.create({data:{orientationId:orientation.id,version:1,title:content.title,content,sourceHash:'e2e-introduction-only'}});
      await database.ieltsOrientation.update({where:{id:orientation.id},data:{status:'PUBLISHED',currentPublishedVersionId:version.id}});
    }
    if (await database.ieltsTopic.findFirst({ where: { slug: 'ielts-education', status: 'PUBLISHED' } })) return;
    await database.learningProgram.update({ where: { slug: 'ielts' }, data: { availabilityStatus: 'BETA' } });
    const fixture = await seedIeltsTopicCurriculum({ database },undefined,new LocalObjectStorageAdapter(process.env.WORKLINGO_E2E_DATA_DIR!));
    expect((await admin.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).status()).toBe(200);
    const draftResponse = await admin.post('/api/v1/admin/ielts-topics', { data: { expectedRevision: null, idempotencyKey: randomUUID(), content: { schemaVersion: 1, title: 'Education', description: 'Disposable study-flow fixture, not release content.', packs: [fixture.pack] } } });
    expect(draftResponse.status(), await draftResponse.text()).toBe(201);
    const draft = await draftResponse.json() as { id: string; draftRevision: number };
    const published = await admin.post(`/api/v1/admin/ielts-topics/${draft.id}/publish`, { data: { expectedRevision: draft.draftRevision, idempotencyKey: randomUUID() } });
    expect(published.status(), await published.text()).toBe(201);
  } finally { await database.$disconnect(); await admin.dispose(); }
}
