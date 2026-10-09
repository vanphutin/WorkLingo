'use client';

import React from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api/api-client';
import { evidenceLabel, formatDate, percent, SKILLS, skillLabels } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';

const loadMemoryHealth = () => apiClient.getMemoryHealth();
const loadMasteryMap = () => apiClient.getMasteryMap();

export function MasteryOverview() {
  const health = useLearnerResource(loadMemoryHealth);
  const map = useLearnerResource(loadMasteryMap);
  const blockNames = new Map(map.data?.items.map((block) => [block.languageBlockId, block.canonicalForm]));

  return (
    <>
      <section className="evidence-panel" aria-labelledby="memory-heading" aria-busy={health.isLoading}>
        <h2 id="memory-heading">Memory Health</h2>
        <p className="evidence-note">Based on evaluated practice and scheduled reviews. Unassessed skills have no score yet.</p>
        {health.isLoading && <p role="status">Loading Memory Health…</p>}
        {health.failed && <div role="alert"><p>Unable to load Memory Health. Please try again.</p><button type="button" onClick={health.retry}>Retry Memory Health</button></div>}
        {health.data && <>
          <p className="health-overall">Overall: <strong>{health.data.overall.health === null ? 'Unassessed' : `${Math.round(health.data.overall.health)}%`}</strong></p>
          <div className="evidence-skill-grid">
            {SKILLS.map((skill) => {
              const evidence = health.data![skill];
              return <article className="evidence-skill-card" key={skill} aria-label={`${skillLabels[skill]} memory health`}>
                <h3>{skillLabels[skill]}</h3>
                <strong className="evidence-score">{evidence.health === null ? 'Unassessed' : `${Math.round(evidence.health)}%`}</strong>
                <p>{evidence.evaluatedBlocksCount} evaluated blocks</p>
                <p>{evidence.dueCount} due · {evidence.needsAttentionCount} need attention</p>
              </article>;
            })}
          </div>
        </>}
      </section>
      <section className="evidence-panel" aria-labelledby="mastery-heading" aria-busy={map.isLoading}>
        <h2 id="mastery-heading">Mastery Map</h2>
        <p className="evidence-note">See the evidence for each workplace phrase across all four skills.</p>
        {map.isLoading && <p role="status">Loading Mastery Map…</p>}
        {map.failed && <div role="alert"><p>Unable to load Mastery Map. Please try again.</p><button type="button" onClick={map.retry}>Retry Mastery Map</button></div>}
        {map.data && (map.data.items.length === 0 ? <p>No language blocks are available for your current level yet.</p> :
          <div className="mastery-blocks">{map.data.items.map((block) => (
            <div className="mastery-block" id={`block-${block.languageBlockId}`} key={block.languageBlockId}>
              <h3>{block.canonicalForm}</h3>
              <p lang="vi">{block.meaning}</p>
              <div className="evidence-skill-grid">{SKILLS.map((skill) => {
                const evidence = block.skills[skill];
                return <article className="evidence-skill-card" key={skill} aria-label={`${skillLabels[skill]} mastery: ${block.canonicalForm}`}>
                  <h4>{skillLabels[skill]}</h4>
                  {evidence ? <>
                    <strong className="evidence-score">{percent(evidence.score)}</strong>
                    <p>{evidenceLabel(evidence.state)}</p>
                    <p>Confidence: {percent(evidence.confidence)}</p>
                    <p>Last evidence: <time dateTime={evidence.lastEvidenceAt}>{formatDate(evidence.lastEvidenceAt)}</time></p>
                    <p>{evidence.nextReviewAt ? <>Review: <time dateTime={evidence.nextReviewAt}>{formatDate(evidence.nextReviewAt)}</time></> : 'No review date scheduled'}</p>
                  </> : <><strong className="evidence-score">Unassessed</strong><p>No evaluated evidence yet.</p></>}
                </article>;
              })}</div>
            </div>
          ))}</div>)}
        {map.data && <section className="review-queue" aria-labelledby="review-heading">
          <h3 id="review-heading">Review queue</h3>
          {map.data.reviewQueue.length === 0 ? <p>No reviews are scheduled. Keep practicing to build your evidence.</p> : <>
            <ul className="evidence-list">{map.data.reviewQueue.map((review) => (
              <li key={`${review.languageBlockId}-${review.skill}`}>
                <a href={`#block-${review.languageBlockId}`}>{blockNames.get(review.languageBlockId) ?? 'Workplace phrase'}</a>
                <span>{skillLabels[review.skill]} · {evidenceLabel(review.priorityReason)}</span>
                <span>{review.nextReviewAt ? <time dateTime={review.nextReviewAt}>{formatDate(review.nextReviewAt)}</time> : 'Practice recommended'}</span>
              </li>
            ))}</ul>
            <Link href="/dashboard">Practice your review items</Link>
          </>}
        </section>}
      </section>
    </>
  );
}
