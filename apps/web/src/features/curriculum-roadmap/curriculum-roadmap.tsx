'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { curriculumRoadmapMessages } from '../../i18n/messages/curriculumRoadmap';
import { localizedError } from '../../i18n/errors';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { apiClient } from '../../lib/api/api-client';
import type { CurriculumRoadmapDto } from '@worklingo/contracts';

interface CurriculumRoadmapProps {
  readonly roadmap: CurriculumRoadmapDto | null;
  readonly isLoading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
}

const stateKeys = {
  available: 'available', completed: 'completed', in_progress: 'inProgress', locked: 'locked',
} as const;

function explainReason(reason: string) {
  if (reason.startsWith('prerequisite_incomplete:')) return 'prerequisiteIncomplete';
  if (reason.startsWith('prerequisite_unavailable:')) return 'prerequisiteUnavailable';
  if (reason === 'bound_lesson_unavailable' || reason === 'no_bound_lessons') return 'lessonUnavailable';
  return 'programUnavailable';
}

function TargetStart({ missionId, revisionId, title }: { missionId: string; revisionId: string; title: string }) {
  const router = useRouter();
  const pending = useRef(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [clientSessionIds] = useState(() => new Map<string, string>());
  const [durationMinutes, setDurationMinutes] = useState(45);
  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    setStarting(revisionId); setStartError(null);
    const key = `${revisionId}:${durationMinutes}`;
    let clientSessionId = clientSessionIds.get(key);
    if (!clientSessionId) { clientSessionId = crypto.randomUUID(); clientSessionIds.set(key, clientSessionId); }
    try {
      const session = await apiClient.createCurriculumSession({ missionId, expectedCurriculumRevisionId: revisionId, durationMinutes, clientSessionId });
      router.push(`/sessions/${session.id}`);
    } catch (cause) { setStartError(cause instanceof Error ? cause.message : 'Unable to start session.'); }
    finally { pending.current = false; setStarting(null); }
  };
  return <div>{startError ? <p role="alert">{startError}</p> : null}<label>Session duration<select disabled={starting !== null} value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}>{[45,60,90].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label><button type="button" className="secondary-action-link" onClick={()=>void start()} disabled={starting !== null}>{starting ? 'Starting…' : `Start ${title}`}</button></div>;
}

export function CurriculumRoadmap({ roadmap, isLoading = false, error = null, onRetry }: CurriculumRoadmapProps) {
  const t = useT('curriculumRoadmap', curriculumRoadmapMessages);
  const { locale } = useLocalePreference();
  if (isLoading) {
    return <section className="dashboard-card roadmap-panel" aria-busy="true"><p role="status">{t('loading')}</p></section>;
  }
  if (error) {
    return (
      <section className="dashboard-card roadmap-panel error-card" role="alert">
        <h2>{t('error')}</h2>
        <p>{localizedError(error, locale)}</p>
        {onRetry ? <button type="button" className="retry-button" onClick={onRetry}>{t('retry')}</button> : null}
      </section>
    );
  }
  if (!roadmap || roadmap.items.length === 0) {
    return (
      <section className="dashboard-card roadmap-panel" aria-labelledby="roadmap-heading">
        <h2 id="roadmap-heading">{t('title')}</h2>
        <p>{t('empty')}</p>
      </section>
    );
  }
  return (
    <section className="roadmap-panel" aria-labelledby="roadmap-heading">
      <div className="roadmap-heading-row">
        <div><span className="card-tag">{t('required')}</span><h2 id="roadmap-heading">{t('title')}</h2></div>
        <p>{t('note')}</p>
      </div>
      <div className="roadmap-grid">
        {roadmap.items.map((item) => (
          <article className={`dashboard-card roadmap-card roadmap-card-${item.state}`} aria-label={item.title} key={item.revisionId}>
            <div className="roadmap-card-header">
              <h3 lang="en">{item.title}</h3>
              <span className="roadmap-state">{t(stateKeys[item.state])}</span>
            </div>
            {item.reviewDue ? <p className="roadmap-review-due">{t('reviewDue')}</p> : null}
            {item.unmetPrerequisites.length > 0 ? (
              <ul className="roadmap-reasons">
                {[...new Set(item.unmetPrerequisites.map(explainReason))].map((reason) => <li key={reason}>{t(reason)}</li>)}
              </ul>
            ) : null}
            <ul className="roadmap-objectives">
              {item.objectives.map((objective) => (
                <li key={objective.slug}>
                  <span lang="en">{objective.statement}</span>
                  <strong>{objective.completed ? t('completed') : t('pending')}</strong>
                </li>
              ))}
            </ul>
            {item.activeSessionId ? (
              <Link className="secondary-action-link" href={`/sessions/${item.activeSessionId}`}>{t('resume', { title: item.title })}</Link>
            ) : item.state === 'available' ? (
              <TargetStart missionId={item.missionId} revisionId={item.revisionId} title={item.title} />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
