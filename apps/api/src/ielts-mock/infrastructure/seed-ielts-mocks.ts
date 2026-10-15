import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
export async function seedIeltsMocks(database: { ieltsMockTest: { upsert(input: unknown): Promise<unknown> } }): Promise<void> {
  await database.ieltsMockTest.upsert({ where: { slug: 'academic-full-mock-1' }, update: {}, create: { slug: 'academic-full-mock-1', draftContent: INITIAL_IELTS_ACADEMIC_MOCK } });
}
