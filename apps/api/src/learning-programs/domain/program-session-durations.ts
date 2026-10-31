import { canonicalBlockTypesByDuration, learningSkillSchema, supportedSessionDurations, type SessionBlockType, type SessionDuration } from '@worklingo/contracts';

/** Durations must have enough pinned content and include every still-required block type. */
export function programSessionDurations(activities: readonly { id: string; learningBlock: SessionBlockType; activityType: string; skills: readonly string[] }[], completedActivityIds: readonly string[], topicDuration?: SessionDuration): SessionDuration[] {
    if (topicDuration) return [topicDuration];
    const completed = new Set(completedActivityIds);
    const pendingBlocks = new Set(activities.filter(a => !completed.has(a.id)).map(a => a.learningBlock));
    return supportedSessionDurations.filter(duration => {
        const blocks = canonicalBlockTypesByDuration[duration];
        if ([...pendingBlocks].some(block => !blocks.includes(block))) return false;
        for (const type of new Set(blocks)) {
            const count = blocks.filter(block => block === type).length;
            const matching = activities.filter(a => a.learningBlock === type);
            if (matching.length < count) return false;
            if (type === 'respond' && ['speaking', 'writing'].some(skill => matching.filter(a => a.activityType === skill).length < count)) return false;
        }
        return learningSkillSchema.options.every(skill => activities.some(a => blocks.includes(a.learningBlock) && a.skills.includes(skill)));
    });
}
