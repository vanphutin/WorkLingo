'use client';

import Link from 'next/link';
import type { CurriculumRoadmapDto } from '@worklingo/contracts';

interface CurriculumRoadmapProps {
  readonly roadmap: CurriculumRoadmapDto | null;
  readonly isLoading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
}

const stateLabels = {
  available: 'Available', completed: 'Completed', in_progress: 'In progress', locked: 'Locked',
} as const;

function explainReason(reason: string): string {
  if (reason.startsWith('prerequisite_incomplete:')) return 'Complete the required earlier curriculum to unlock this mission.';
  if (reason.startsWith('prerequisite_unavailable:')) return 'A required earlier curriculum is currently unavailable.';
  if (reason === 'bound_lesson_unavailable' || reason === 'no_bound_lessons') return 'Required lesson content is currently unavailable.';
  return 'This mission is not available in your current learning program.';
}

export function CurriculumRoadmap({ roadmap, isLoading = false, error = null, onRetry }: CurriculumRoadmapProps) {
  if (isLoading) {
    return <section className="dashboard-card roadmap-panel" aria-busy="true"><p role="status">Loading curriculum roadmap…</p></section>;
  }
  if (error) {
    return (
      <section className="dashboard-card roadmap-panel error-card" role="alert">
        <h2>Unable to load curriculum roadmap</h2>
        <p>{error}</p>
        {onRetry ? <button type="button" className="retry-button" onClick={onRetry}>Retry curriculum roadmap</button> : null}
      </section>
    );
  }
  if (!roadmap || roadmap.items.length === 0) {
    return (
      <section className="dashboard-card roadmap-panel" aria-labelledby="roadmap-heading">
        <h2 id="roadmap-heading">Curriculum Roadmap</h2>
        <p>No published curriculum is available for your active program yet.</p>
      </section>
    );
  }
  return (
    <section className="roadmap-panel" aria-labelledby="roadmap-heading">
      <div className="roadmap-heading-row">
        <div><span className="card-tag">Required objectives</span><h2 id="roadmap-heading">Curriculum Roadmap</h2></div>
        <p>Progress is based on evaluated evidence saved by the server.</p>
      </div>
      <div className="roadmap-grid">
        {roadmap.items.map((item) => (
          <article className={`dashboard-card roadmap-card roadmap-card-${item.state}`} aria-label={item.title} key={item.revisionId}>
            <div className="roadmap-card-header">
              <h3>{item.title}</h3>
              <span className="roadmap-state">{stateLabels[item.state]}</span>
            </div>
            {item.reviewDue ? <p className="roadmap-review-due">Review due</p> : null}
            {item.unmetPrerequisites.length > 0 ? (
              <ul className="roadmap-reasons">
                {[...new Set(item.unmetPrerequisites.map(explainReason))].map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            ) : null}
            <ul className="roadmap-objectives">
              {item.objectives.map((objective) => (
                <li key={objective.slug}>
                  <span>{objective.statement}</span>
                  <strong>{objective.completed ? 'Completed' : 'Pending evaluation'}</strong>
                </li>
              ))}
            </ul>
            {item.activeSessionId ? (
              <Link className="secondary-action-link" href={`/sessions/${item.activeSessionId}`}>Resume {item.title}</Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
