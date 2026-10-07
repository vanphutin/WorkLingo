export const sessionId = '11111111-1111-4111-8111-111111111111';
export const assessmentId = '22222222-2222-4222-8222-222222222222';
export const blockId = '33333333-3333-4333-8333-333333333333';
export const timestamp = '2026-10-07T09:00:00.000Z';

export const masteryMap = {
  items: [{
    languageBlockId: blockId, slug: 'follow-up', canonicalForm: 'follow up', meaning: 'Check on progress',
    skills: {
      reading: { state: 'NEEDS_ATTENTION', score: 0, confidence: 0.25, nextReviewAt: null, lastEvidenceAt: timestamp },
      listening: null, speaking: null, writing: null,
    },
  }],
  reviewQueue: [{ languageBlockId: blockId, skill: 'reading', priorityReason: 'NEEDS_ATTENTION', nextReviewAt: null }],
};
export const emptyMasteryMap = { items: [], reviewQueue: [] };
const unassessedHealth = { health: null, evaluatedBlocksCount: 0, dueCount: 0, needsAttentionCount: 0 };
export const memoryHealth = {
  reading: { health: 0, evaluatedBlocksCount: 1, dueCount: 1, needsAttentionCount: 1 },
  listening: unassessedHealth, speaking: unassessedHealth, writing: unassessedHealth,
  overall: { health: 0, evaluatedBlocksCount: 1, dueCount: 1, needsAttentionCount: 1 },
};
export const errorItem = {
  id: '44444444-4444-4444-8444-444444444444', languageBlockId: blockId,
  languageBlockSlug: 'follow-up', canonicalForm: 'follow up', skill: 'reading',
  errorType: 'ACTIVITY_INCORRECT', evidenceGranularity: 'ACTIVITY', contextKey: 'lesson:email',
  activityId: '55555555-5555-4555-8555-555555555555', activitySlug: 'read-email',
  occurrenceCount: 2, firstOccurredAt: timestamp, lastOccurredAt: timestamp,
  lessonVersionId: '66666666-6666-4666-8666-666666666666',
};
export const emptyErrorBank = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 };
export const pendingSkill = { score: null, threshold: 0.7, pendingCount: 1, evaluatedCount: 0, passed: false };
export const passedSkill = { score: 0.8, threshold: 0.7, pendingCount: 0, evaluatedCount: 1, passed: true };
export const pendingAssessment = {
  id: assessmentId, sessionId, levelCode: 'FOUNDATION_1', policyVersion: 'workplace-checkpoint-v1',
  status: 'pending_evaluation', createdAt: timestamp,
  skills: { reading: passedSkill, listening: passedSkill, speaking: pendingSkill, writing: pendingSkill },
  reinforcement: [], canAdvance: false, nextLevelCode: null,
};
export const progression = {
  currentLevelCode: 'FOUNDATION_1', nextLevelCode: 'FOUNDATION_2', eligibleSessionId: sessionId,
  canAssess: true, reasons: [], latestAssessment: null,
};
