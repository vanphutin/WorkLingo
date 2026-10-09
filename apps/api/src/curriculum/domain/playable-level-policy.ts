import type { PublishedMission } from './curriculum.types.js';
import { computeAvailableDurations } from '../../learning-sessions/domain/session-planner.js';

export interface PlayableLevelCandidate {
  readonly cefrReference: string;
  readonly code: string;
  readonly missions: readonly PublishedMission[];
  readonly name: string;
}

export interface PlayableLevel {
  readonly available: boolean;
  readonly cefrReference: string;
  readonly code: string;
  readonly name: string;
  readonly reason: string;
}

export interface FindPlayableLevelsInput {
  readonly levels: readonly PlayableLevelCandidate[];
}

export function findPlayableLevels(input: FindPlayableLevelsInput): PlayableLevel[] {
  return input.levels.map((level) => {
    const learningMissions = level.missions.filter((mission) => mission.purpose === 'learning');
    const available = learningMissions.some((mission) =>
      computeAvailableDurations(mission).includes(60),
    );

    return {
      available,
      cefrReference: level.cefrReference,
      code: level.code,
      name: level.name,
      reason: learningMissions.length === 0
        ? 'No published learning mission is available.'
        : available
          ? 'A published 60-minute four-skill learning mission is available.'
          : 'Published learning content cannot form a canonical 60-minute four-skill session.',
    };
  });
}
