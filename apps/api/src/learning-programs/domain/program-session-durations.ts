import { canonicalBlockTypesByDuration, supportedSessionDurations, type SessionDuration } from '@worklingo/contracts';
import type { LessonSnapshot, PublishedMission } from '../../curriculum/domain/curriculum.types.js';
import { planFoundationSession } from '../../learning-sessions/domain/session-planner.js';

function programSessionPlans(content: LessonSnapshot, completedActivityIds: readonly string[]) {
    const completed = new Set(completedActivityIds);
    const pending = content.activities.filter(activity => !completed.has(activity.id));
    // Validation identities never leave this pure planner call.
    const id = '00000000-0000-4000-8000-000000000001';
    const mission: PublishedMission = { id, slug: 'program-validation', title: content.title, objective: 'Validate session coverage', levelCode: 'PROGRAM', purpose: 'learning', lessonVersion: { ...content, id, version: 1 } };
    const durations = content.intermediateTopic ? [content.intermediateTopic.durationMinutes] : supportedSessionDurations;
    return durations.flatMap(durationMinutes => {
        if (!content.intermediateTopic && pending.some(activity => !canonicalBlockTypesByDuration[durationMinutes].includes(activity.learningBlock))) return [];
        try {
            const plan = planFoundationSession({ mission, durationMinutes, completedActivityIds, productivePairPerRespondBlock: true });
            const selected = new Set(plan.blocks.flatMap(block => block.activityIds));
            return pending.length && !pending.some(activity => selected.has(activity.id)) ? [] : [plan];
        } catch { return []; }
    });
}

/** Offer only actual authored plans that can advance the pending activity coverage. */
export function programSessionDurations(content: LessonSnapshot, completedActivityIds: readonly string[]): SessionDuration[] {
    return programSessionPlans(content, completedActivityIds).map(plan => plan.durationMinutes);
}

/** Follow the same shortest-duration recommendation until all pinned activities are reachable. */
export function programLessonCanComplete(content: LessonSnapshot): boolean {
    const completed = new Set<string>();
    while (completed.size < content.activities.length) {
        const plan = programSessionPlans(content, [...completed])[0];
        if (!plan) return false;
        const previousSize = completed.size;
        for (const id of plan.blocks.flatMap(block => block.activityIds)) completed.add(id);
        if (completed.size === previousSize) return false;
    }
    return true;
}
