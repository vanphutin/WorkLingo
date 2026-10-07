import { documentContextSignature } from '../../curriculum/domain/context-signature.js';
import type { CurriculumActivity, PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import type { ScheduledReviewItemReference } from './session-plan.types.js';

export function contextSignatures(mission: PublishedMission, activity: CurriculumActivity): string[] {
  return mission.lessonVersion.contentBlocks
    .filter((block) => activity.contentReferences.includes(block.slug))
    .map((block) => documentContextSignature(block.type, block.text));
}

export function matchesReview(
  mission: PublishedMission, activity: CurriculumActivity, review: ScheduledReviewItemReference,
): boolean {
  const slug = mission.lessonVersion.wordBanks.flatMap((bank) => bank.languageBlocks)
    .find((block) => block.id === review.languageBlockId)?.slug;
  return Boolean(slug && activity.languageBlockReferences.includes(slug) && activity.skills.includes(review.skill));
}

export function isTransfer(
  mission: PublishedMission, activity: CurriculumActivity, review: ScheduledReviewItemReference,
): boolean {
  if (!matchesReview(mission, activity, review) || !review.previousContextSignatures?.length) return false;
  return contextSignatures(mission, activity).some((signature) =>
    !review.previousContextSignatures!.includes(signature));
}

/** Input curriculum and scheduler order are authoritative tie breakers. */
export function selectMissionForReview(
  missions: readonly PublishedMission[],
  reviews: readonly ScheduledReviewItemReference[],
  completedMissionIds: readonly string[],
): PublishedMission {
  if (!missions.length) throw new Error('No published mission available');
  const rank = (mission: PublishedMission) => {
    const matched = reviews.findIndex((review) =>
      mission.lessonVersion.activities.some((activity) => matchesReview(mission, activity, review)));
    return matched < 0 ? Number.MAX_SAFE_INTEGER : matched;
  };
  const transferRank = (mission: PublishedMission) => {
    const rank = reviews.findIndex((review) =>
      mission.lessonVersion.activities.some((activity) => isTransfer(mission, activity, review)));
    return rank < 0 ? Number.MAX_SAFE_INTEGER : rank;
  };
  return missions.map((mission, order) => ({ mission, order }))
    .sort((a, b) => rank(a.mission) - rank(b.mission) ||
      transferRank(a.mission) - transferRank(b.mission) ||
      Number(completedMissionIds.includes(a.mission.id)) - Number(completedMissionIds.includes(b.mission.id)) ||
      a.order - b.order)[0]!.mission;
}
