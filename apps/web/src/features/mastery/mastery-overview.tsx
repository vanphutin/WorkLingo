'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { masteryMessages } from '../../i18n/messages/mastery';
import { localizedError } from '../../i18n/errors';

import React from 'react';
import Link from 'next/link';
import { apiClient } from '../../lib/api/api-client';
import { evidenceLabel, formatDate, percent, SKILLS } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';

const loadMemoryHealth = () => apiClient.getMemoryHealth();
const loadMasteryMap = () => apiClient.getMasteryMap();

export function MasteryOverview() {
  const t = useT('mastery', masteryMessages);
  const { locale } = useLocalePreference();
  const health = useLearnerResource(loadMemoryHealth);
  const map = useLearnerResource(loadMasteryMap);
  const blockNames = new Map(map.data?.items.map((block) => [block.languageBlockId, block.canonicalForm]));

  return (
    <>
      <section className="evidence-panel" aria-labelledby="memory-heading" aria-busy={health.isLoading}>
        <h2 id="memory-heading">{t('memory')}</h2>
        <p className="evidence-note">{t('memoryNote')}</p>
        {health.isLoading && <p role="status">{t('loadingMemory')}</p>}
        {health.failed && <div role="alert"><p>{t('memoryError')}</p><p>{localizedError(health.error, locale)}</p><button type="button" onClick={health.retry}>{t('retryMemory')}</button></div>}
        {health.data && <>
          <p className="health-overall">{t('overall')}{' '}<strong>{health.data.overall.health === null ? t('unassessed') : percent(health.data.overall.health / 100, locale)}</strong></p>
          <div className="evidence-skill-grid">
            {SKILLS.map((skill) => {
              const evidence = health.data![skill];
              return <article className="evidence-skill-card" key={skill} aria-label={t('memoryAria', { skill: t(skill) })}>
                <h3>{t(skill)}</h3>
                <strong className="evidence-score">{evidence.health === null ? t('unassessed') : percent(evidence.health / 100, locale)}</strong>
                <p>{t('evaluatedBlocks', { count: evidence.evaluatedBlocksCount })}</p>
                <p>{t('dueAttention', { due: evidence.dueCount, attention: evidence.needsAttentionCount })}</p>
              </article>;
            })}
          </div>
        </>}
      </section>
      <section className="evidence-panel" aria-labelledby="mastery-heading" aria-busy={map.isLoading}>
        <h2 id="mastery-heading">{t('map')}</h2>
        <p className="evidence-note">{t('mapNote')}</p>
        {map.isLoading && <p role="status">{t('loadingMap')}</p>}
        {map.failed && <div role="alert"><p>{t('mapError')}</p><p>{localizedError(map.error, locale)}</p><button type="button" onClick={map.retry}>{t('retryMap')}</button></div>}
        {map.data && (map.data.items.length === 0 ? <p>{t('emptyMap')}</p> :
          <div className="mastery-blocks">{map.data.items.map((block) => (
            <div className="mastery-block" id={`block-${block.languageBlockId}`} key={block.languageBlockId}>
              <h3 lang="en">{block.canonicalForm}</h3>
              <p lang="vi">{block.meaning}</p>
              <div className="evidence-skill-grid">{SKILLS.map((skill) => {
                const evidence = block.skills[skill];
                return <article className="evidence-skill-card" key={skill} aria-label={t('masteryAria', { skill: t(skill), phrase: block.canonicalForm })}>
                  <h4>{t(skill)}</h4>
                  {evidence ? <>
                    <strong className="evidence-score">{percent(evidence.score, locale)}</strong>
                    <p>{evidenceLabel(evidence.state, locale)}</p>
                    <p>{t('confidence')}{' '}{percent(evidence.confidence, locale)}</p>
                    <p>{t('lastEvidence')}{' '}<time dateTime={evidence.lastEvidenceAt}>{formatDate(evidence.lastEvidenceAt, locale)}</time></p>
                    <p>{evidence.nextReviewAt ? <>{t('review')}{' '}<time dateTime={evidence.nextReviewAt}>{formatDate(evidence.nextReviewAt, locale)}</time></> : t('noReviewDate')}</p>
                  </> : <><strong className="evidence-score">{t('unassessed')}</strong><p>{t('noEvidence')}</p></>}
                </article>;
              })}</div>
            </div>
          ))}</div>)}
        {map.data && <section className="review-queue" aria-labelledby="review-heading">
          <h3 id="review-heading">{t('reviewQueue')}</h3>
          {map.data.reviewQueue.length === 0 ? <p>{t('emptyReviews')}</p> : <>
            <ul className="evidence-list">{map.data.reviewQueue.map((review) => (
              <li key={`${review.languageBlockId}-${review.skill}`}>
                <a href={`#block-${review.languageBlockId}`} lang={blockNames.has(review.languageBlockId) ? 'en' : undefined}>{blockNames.get(review.languageBlockId) ?? t('workplacePhrase')}</a>
                <span>{t(review.skill)} · {evidenceLabel(review.priorityReason, locale)}</span>
                <span>{review.nextReviewAt ? <time dateTime={review.nextReviewAt}>{formatDate(review.nextReviewAt, locale)}</time> : t('practiceRecommended')}</span>
              </li>
            ))}</ul>
            <Link href="/dashboard">{t('practiceReviews')}</Link>
          </>}
        </section>}
      </section>
    </>
  );
}
