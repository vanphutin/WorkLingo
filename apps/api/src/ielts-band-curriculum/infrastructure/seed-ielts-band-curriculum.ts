import { INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';

interface SeedDatabase {
  ieltsBandCurriculum: { upsert(input: { where: { slug: string }; update: Record<string, never>; create: { slug: string; draftContent: typeof INITIAL_IELTS_BAND_CURRICULUM } }): Promise<unknown> };
}

export async function seedIeltsBandCurriculum(database: SeedDatabase): Promise<void> {
  await database.ieltsBandCurriculum.upsert({ where: { slug: 'ielts-band-pathway' }, update: {}, create: { slug: 'ielts-band-pathway', draftContent: INITIAL_IELTS_BAND_CURRICULUM } });
}
