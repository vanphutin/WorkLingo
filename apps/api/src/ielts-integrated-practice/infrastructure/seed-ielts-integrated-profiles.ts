import { INITIAL_IELTS_INTEGRATED_PROFILES, type IeltsIntegratedProfileContent } from '@worklingo/contracts';

interface SeedDatabase {
  ieltsIntegratedProfile: { upsert(input: { where: { durationMinutes: number }; update: Record<string, never>; create: { durationMinutes: number; draftContent: IeltsIntegratedProfileContent } }): Promise<unknown> };
}

export async function seedIeltsIntegratedProfiles(database: SeedDatabase): Promise<void> {
  for (const content of INITIAL_IELTS_INTEGRATED_PROFILES) {
    await database.ieltsIntegratedProfile.upsert({
      where: { durationMinutes: content.durationMinutes }, update: {},
      create: { durationMinutes: content.durationMinutes, draftContent: content },
    });
  }
}
