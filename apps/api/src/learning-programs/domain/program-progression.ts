import type { ProgramEnrollmentStatus, ProgramProgressDto, ProgramProgressItem, ProgramVersionInput, SessionDuration } from '@worklingo/contracts';
export interface ProgramAttemptEvidence {
    enrollmentId: string;
    programVersionId: string;
    curriculumRevisionId: string;
    lessonVersionId: string;
    activityId: string;
    attemptId: string;
    sessionId: string;
    skill: string;
    attemptedAt?: string;
    sessionStartedAt?: string;
    completedAt: string;
    source: 'DETERMINISTIC' | 'AI';
    evaluationStatus: string;
    qualification: 'QUALIFIED' | 'PENDING' | 'UNQUALIFIED';
    score: number | null;
    evaluationVersion: string;
}
export interface ProgramEvidence {
    enrollmentId: string;
    programVersionId: string;
    status: ProgramEnrollmentStatus;
    attempts: ProgramAttemptEvidence[];
    resumes: {
        curriculumRevisionId: string;
        lessonVersionId: string;
        sessionId: string;
        createdAt: string;
    }[];
    continuations?: { curriculumRevisionId: string; lessonVersionId: string; completedActivityIds: string[]; availableDurations: SessionDuration[] }[];
    reviews: {
        curriculumRevisionId: string;
        lessonVersionId: string;
        dueAt: string;
        lastCompletedAt: string | null;
    }[];
}
export function projectProgramProgress(snapshot: ProgramVersionInput, evidence: ProgramEvidence, now: string): ProgramProgressDto {
    const items: ProgramProgressItem[] = [];
    const policy = snapshot.policy;
    for (const binding of [...snapshot.curriculumBindings].sort((a, b) => a.order - b.order || a.curriculumRevisionId.localeCompare(b.curriculumRevisionId))) {
        for (const lesson of [...binding.lessons].sort((a, b) => a.order - b.order || a.lessonVersionId.localeCompare(b.lessonVersionId))) {
            const attempts = [...new Map(evidence.attempts.filter(a => a.enrollmentId === evidence.enrollmentId && a.programVersionId === evidence.programVersionId && a.curriculumRevisionId === binding.curriculumRevisionId && a.lessonVersionId === lesson.lessonVersionId && lesson.activityIds.includes(a.activityId) && a.completedAt <= now).map(a => [a.attemptId, a])).values()];
            const completedActivities = new Set(attempts.map(a => a.activityId));
            const completionRatio = completedActivities.size / lesson.activityIds.length;
            const completed = completionRatio >= policy.completion.requiredActivityRatio;
            const qualified = attempts.filter(a => a.qualification === 'QUALIFIED' && a.evaluationStatus === 'EVALUATED' && a.score !== null && Number.isFinite(a.score) && a.score >= 0 && a.score <= 1);
            // Readiness requires qualified coverage of each required activity; a perfect reading attempt cannot qualify pending speaking.
            const latest = lesson.activityIds.map(activityId => qualified.filter(a => a.activityId === activityId).sort((a, b) => b.completedAt.localeCompare(a.completedAt) || (b.attemptedAt ?? b.completedAt).localeCompare(a.attemptedAt ?? a.completedAt) || b.attemptId.localeCompare(a.attemptId)));
            const score = qualified.length ? latest.flatMap(a => a[0] ? [a[0].score!] : []).reduce((sum, s) => sum + s, 0) / latest.filter(a => a.length).length : null;
            const mastered = latest.every(a => a.length >= policy.mastery.minimumQualifiedAttempts && a[0]!.score! >= policy.mastery.threshold);
            const mastery: ProgramProgressItem['mastery'] = { status: mastered ? 'MASTERED' : attempts.some(a => a.qualification !== 'QUALIFIED') ? 'PENDING' : qualified.length ? 'DEVELOPING' : 'UNKNOWN', score, qualifiedAttempts: new Set(qualified.map(a => a.attemptId)).size };
            const review = evidence.reviews.find(r => r.curriculumRevisionId === binding.curriculumRevisionId && r.lessonVersionId === lesson.lessonVersionId);
            const reviewCompleted = review?.lastCompletedAt !== null && review?.lastCompletedAt !== undefined && review.lastCompletedAt <= now;
            const ready = completed && (!policy.mastery.required || mastered) && (!policy.review.requiredForReadiness || reviewCompleted);
            const sessionIds = new Set(attempts.map(a => a.sessionId));
            const last = attempts.map(a => a.completedAt).sort().at(-1);
            const retryAt = last && completed && policy.mastery.required && !mastered && policy.retry.cooldownMinutes ? new Date(Date.parse(last) + policy.retry.cooldownMinutes * 60000).toISOString() : null;
            const remediation = !ready && policy.remediation.enabled && sessionIds.size >= policy.remediation.afterAttempts;
            const reasons: string[] = [];
            if (evidence.status !== 'ACTIVE')
                reasons.push(`enrollment_${evidence.status.toLowerCase()}`);
            for (const prerequisite of binding.prerequisiteRevisionIds)
                if (!items.some(i => i.curriculumRevisionId === prerequisite) || items.some(i => i.curriculumRevisionId === prerequisite && !i.ready))
                    reasons.push(`prerequisite_not_ready:${prerequisite}`);
            if (policy.sequential.stages && items.some(i => i.levelId !== binding.levelId && i.required && !i.ready))
                reasons.push('previous_stage_not_ready');
            if (policy.sequential.units && items.some(i => i.levelId === binding.levelId && i.curriculumRevisionId !== binding.curriculumRevisionId && i.required && !i.ready))
                reasons.push('previous_unit_not_ready');
            if (policy.sequential.lessons && items.some(i => i.curriculumRevisionId === binding.curriculumRevisionId && !i.ready))
                reasons.push('previous_lesson_not_ready');
            if (completed && policy.mastery.required && !mastered && sessionIds.size >= policy.retry.maxAttempts && !remediation)
                reasons.push('retry_limit_reached');
            if (retryAt && retryAt > now)
                reasons.push('retry_cooldown');
            const eligible = !reasons.length;
            const resume = eligible ? evidence.resumes.filter(r => r.curriculumRevisionId === binding.curriculumRevisionId && r.lessonVersionId === lesson.lessonVersionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.sessionId.localeCompare(b.sessionId))[0] : undefined;
            const durations = evidence.continuations?.find(c => c.curriculumRevisionId === binding.curriculumRevisionId && c.lessonVersionId === lesson.lessonVersionId)?.availableDurations;
            items.push({ ...(durations ? { availableDurations: durations, recommendedDurationMinutes: durations.includes(60) ? 60 : durations[0] ?? null } : {}), curriculumRevisionId: binding.curriculumRevisionId, pathId: binding.pathId, levelId: binding.levelId, missionId: binding.missionId, lessonVersionId: lesson.lessonVersionId, title: lesson.title, objectives: lesson.objectives, required: binding.required, order: items.length + 1, state: !eligible ? 'locked' : resume ? 'in_progress' : completed ? 'completed' : 'available', eligible, reasons, readinessReasons: [...(!completed ? ['required_activities_incomplete'] : []), ...(policy.mastery.required && !mastered ? [mastery.status === 'PENDING' ? 'mastery_pending' : mastery.status === 'UNKNOWN' ? 'mastery_unknown' : 'mastery_below_threshold'] : []), ...(policy.review.requiredForReadiness && !reviewCompleted ? ['review_completion_required'] : [])], completed, completionRatio, ready, mastery, attempts: sessionIds.size, retryAt, remediation, activeSessionId: resume?.sessionId ?? null, reviewDueAt: review?.dueAt ?? null, reviewCompleted, estimatedMinutes: lesson.estimatedMinutes });
        }
    }
    const required = items.filter(i => i.required);
    const ready = required.length > 0 && required.every(i => i.ready);
    const eligible = items.filter(i => i.eligible);
    const resume = eligible.find(i => i.activeSessionId);
    const due = eligible.filter(i => i.reviewDueAt && i.reviewDueAt <= now).sort((a, b) => a.reviewDueAt!.localeCompare(b.reviewDueAt!) || a.order - b.order || a.lessonVersionId.localeCompare(b.lessonVersionId))[0];
    const remediation = eligible.find(i => i.remediation);
    const retry = eligible.find(i => !i.ready && i.completed);
    const learn = eligible.find(i => !i.completed);
    const target = resume ?? due ?? remediation ?? retry ?? learn;
    const type = resume ? 'resume' : due ? 'review' : remediation ? 'remediation' : retry ? 'retry' : learn ? 'learn' : ready ? 'complete' : 'wait';
    const aggregate = (key: 'levelId' | 'curriculumRevisionId') => [...new Set(items.map(i => i[key]))].map(id => { const group = items.filter(i => i[key] === id); return { id, title: (key === 'levelId' ? snapshot.curriculumBindings.find(b => b.levelId === id)!.levelTitle : undefined) ?? snapshot.curriculumBindings.find(b => (key === 'levelId' ? b.levelId : b.curriculumRevisionId) === id)!.title, itemCount: group.length, completedCount: group.filter(i => i.completed).length, ready: group.filter(i => i.required).every(i => i.ready) }; });
    const evidenceDimensions: ProgramProgressDto['evidenceDimensions'] = (['vocabulary', 'grammar', 'pronunciation', 'reading', 'listening', 'speaking', 'writing'] as const).map(dimension => {
        const foundation = ['vocabulary', 'grammar', 'pronunciation'].includes(dimension);
        const matching = foundation ? [] : evidence.attempts.filter(a => a.skill === dimension && a.enrollmentId === evidence.enrollmentId && a.programVersionId === evidence.programVersionId && a.completedAt <= now && items.some(i => i.curriculumRevisionId === a.curriculumRevisionId && i.lessonVersionId === a.lessonVersionId && snapshot.curriculumBindings.find(b => b.curriculumRevisionId === i.curriculumRevisionId)!.lessons.find(l => l.lessonVersionId === i.lessonVersionId)!.activityIds.includes(a.activityId)));
        const qualified = [...new Map(matching.filter(a => a.qualification === 'QUALIFIED' && a.evaluationStatus === 'EVALUATED' && a.score !== null).map(a => [a.attemptId, a])).values()];
        const score = qualified.length ? qualified.reduce((sum, a) => sum + a.score!, 0) / qualified.length : null;
        return { dimension, status: matching.some(a => a.qualification !== 'QUALIFIED') ? 'PENDING' : score === null ? 'UNKNOWN' : score >= policy.mastery.threshold ? 'MASTERED' : 'DEVELOPING', score, qualifiedAttempts: qualified.length, sources: [...new Set(matching.map(a => a.source))], reason: foundation ? 'no_qualified_foundation_evidence' : matching.length ? null : 'no_matching_session_evidence' };
    });
    const qualified = items.reduce((sum, i) => sum + i.mastery.qualifiedAttempts, 0);
    const scores = items.flatMap(i => i.mastery.score === null ? [] : [i.mastery.score]);
    return { enrollmentId: evidence.enrollmentId, programVersionId: evidence.programVersionId, status: evidence.status, engineVersion: 'program-progression-v1', policyVersion: 1, projectedAt: now, completed: required.length > 0 && required.every(i => i.completed), ready, completionPercentage: required.length ? required.reduce((sum, i) => sum + i.completionRatio, 0) * 100 / required.length : 0, mastery: { status: required.every(i => i.mastery.status === 'MASTERED') ? 'MASTERED' : items.some(i => i.mastery.status === 'PENDING') ? 'PENDING' : qualified ? 'DEVELOPING' : 'UNKNOWN', score: scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null, qualifiedAttempts: qualified }, evidenceDimensions, stages: aggregate('levelId'), units: aggregate('curriculumRevisionId'), items, estimatedRemainingMinutes: items.reduce((sum, i) => sum + i.estimatedMinutes * (1 - i.completionRatio), 0), nextAction: { type, curriculumRevisionId: target?.curriculumRevisionId ?? null, lessonVersionId: target?.lessonVersionId ?? null, sessionId: target?.activeSessionId ?? null, reasons: target ? [] : [...new Set(items.flatMap(i => i.reasons))] } };
}
