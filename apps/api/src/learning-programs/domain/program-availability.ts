import { programVersionInputSchema, type LearningProgramAvailabilityStatusDto } from '@worklingo/contracts';

interface ProgramAccessInput {
  availabilityStatus: LearningProgramAvailabilityStatusDto;
  slug: string;
  ieltsReady?: boolean;
  hasPublishedRelease?: boolean;
  progressionPolicy?: string;
  curriculumRevisionIds?: readonly string[];
}

export interface ProgramAccess {
  destination: '/dashboard' | '/ielts' | null;
  isSelectable: boolean;
}

const APPROVED_DESTINATIONS: Readonly<Record<string, '/dashboard' | '/ielts'>> = {
  intermediate: '/dashboard',
  ielts: '/ielts',
};

export function deriveProgramAccess(input: ProgramAccessInput): ProgramAccess {
  const generic = !['beginner','intermediate','ielts','toeic'].includes(input.slug) && input.progressionPolicy === 'ACTIVITY_COMPLETION' && Boolean(input.curriculumRevisionIds?.length);
  const beginner = input.slug === 'beginner' && input.hasPublishedRelease === true && input.progressionPolicy === 'ACTIVITY_COMPLETION' && Boolean(input.curriculumRevisionIds?.length);
  const destination = APPROVED_DESTINATIONS[input.slug] ?? (generic || beginner ? '/dashboard' : undefined);
  const isReleased =
    input.availabilityStatus === 'AVAILABLE' || input.availabilityStatus === 'BETA';

  if (!destination || !isReleased || (input.slug === 'ielts' && !input.ieltsReady)) {
    return { destination: null, isSelectable: false };
  }

  return { destination, isSelectable: true };
}

/** A mutable availability flag or curriculum pins alone never establish a Beginner release. */
export function hasPublishedProgramRelease(release: { source: string; status: string; snapshot: unknown; curriculumRevisionIds: readonly string[] } | null | undefined): boolean {
  if (release?.source !== 'AUTHORED' || release.status !== 'PUBLISHED') return false;
  const parsed = programVersionInputSchema.safeParse(release.snapshot);
  return parsed.success && parsed.data.curriculumBindings.some(binding => binding.required) &&
    JSON.stringify(parsed.data.curriculumBindings.map(binding => binding.curriculumRevisionId)) === JSON.stringify(release.curriculumRevisionIds);
}
