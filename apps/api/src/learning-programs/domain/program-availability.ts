import type { LearningProgramAvailabilityStatusDto } from '@worklingo/contracts';

interface ProgramAccessInput {
  availabilityStatus: LearningProgramAvailabilityStatusDto;
  slug: string;
}

export interface ProgramAccess {
  destination: '/dashboard' | null;
  isSelectable: boolean;
}

const APPROVED_DESTINATIONS: Readonly<Record<string, '/dashboard'>> = {
  intermediate: '/dashboard',
};

export function deriveProgramAccess(input: ProgramAccessInput): ProgramAccess {
  const destination = APPROVED_DESTINATIONS[input.slug];
  const isReleased =
    input.availabilityStatus === 'AVAILABLE' || input.availabilityStatus === 'BETA';

  if (!destination || !isReleased) {
    return { destination: null, isSelectable: false };
  }

  return { destination, isSelectable: true };
}
