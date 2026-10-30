import type { LearningProgramAvailabilityStatusDto } from '@worklingo/contracts';

interface ProgramAccessInput {
  availabilityStatus: LearningProgramAvailabilityStatusDto;
  slug: string;
  ieltsReady?: boolean;
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
  const destination = APPROVED_DESTINATIONS[input.slug] ?? (generic ? '/dashboard' : undefined);
  const isReleased =
    input.availabilityStatus === 'AVAILABLE' || input.availabilityStatus === 'BETA';

  if (!destination || !isReleased || (input.slug === 'ielts' && !input.ieltsReady)) {
    return { destination: null, isSelectable: false };
  }

  return { destination, isSelectable: true };
}
