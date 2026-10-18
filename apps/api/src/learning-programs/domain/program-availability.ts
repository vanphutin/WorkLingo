import type { LearningProgramAvailabilityStatusDto } from '@worklingo/contracts';

interface ProgramAccessInput {
  availabilityStatus: LearningProgramAvailabilityStatusDto;
  slug: string;
  ieltsReady?: boolean;
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
  const destination = APPROVED_DESTINATIONS[input.slug];
  const isReleased =
    input.availabilityStatus === 'AVAILABLE' || input.availabilityStatus === 'BETA';

  if (!destination || !isReleased || (input.slug === 'ielts' && !input.ieltsReady)) {
    return { destination: null, isSelectable: false };
  }

  return { destination, isSelectable: true };
}
