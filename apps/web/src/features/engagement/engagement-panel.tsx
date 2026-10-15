'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { engagementMessages } from '../../i18n/messages/engagement';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';

import React, { useState } from 'react';
import Link from 'next/link';
import type { EngagementSkillStatus, EngagementSummaryDto } from '@worklingo/contracts';

interface EngagementPanelProps {
  readonly engagement: EngagementSummaryDto | null;
  readonly error?: string | null | undefined;
  readonly isLoading?: boolean | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly onUpdateTarget: (targetDays: number) => Promise<void> | void;
}

const TARGET_OPTIONS = [2, 3, 4, 5] as const;

const statusKeys = {
  IMPROVING: 'improving', NEEDS_ATTENTION: 'needsAttention', STEADY: 'steady', INSUFFICIENT_EVIDENCE: 'insufficient',
} as const satisfies Record<EngagementSkillStatus, keyof typeof engagementMessages.en>;

export function EngagementPanel({
  engagement,
  error = null,
  isLoading = false,
  onRetry,
  onUpdateTarget,
}: EngagementPanelProps) {
  const t = useT('engagement', engagementMessages);
  const { locale } = useLocalePreference();
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const [targetError, setTargetError] = useState<unknown>(null);

  if (isLoading) {
    return (
      <section className="dashboard-card engagement-card" aria-busy="true">
        <p className="loading-indicator" role="status">{t('loading')}</p>
      </section>
    );
  }

  if (error || !engagement) {
    return (
      <section className="dashboard-card engagement-card error-card" role="alert">
        <span className="card-tag">{t('weekly')}</span>
        <h2 className="section-title">{t('loadError')}</h2>
        <p className="error-message">{error ? localizedError(error, locale) : t('noData')}</p>
        {onRetry && (
          <button type="button" className="retry-button" onClick={onRetry}>{t('retry')}</button>
        )}
      </section>
    );
  }

  const { consistency, currentWeek, evidenceOfProgress } = engagement;

  const handleTargetChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = Number(event.target.value);
    try {
      setIsUpdatingTarget(true);
      setTargetError(null);
      await onUpdateTarget(newTarget);
    } catch (error) {
      setTargetError(error);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  return (
    <section className="dashboard-card engagement-card" aria-labelledby="engagement-heading">
      <span className="card-tag">{t('kicker')}</span>
      <h2 id="engagement-heading" className="section-title">{t('title')}</h2>

      <div className="engagement-overview-grid">
        {/* Weekly Mission Card */}
        <div className="engagement-stat-card mission-progress-card">
          <span className="stat-label">{t('thisWeek')}</span>
          <strong className="stat-value">
            {t('days', { completed: currentWeek.completedDays, target: currentWeek.targetDays })}
          </strong>
          <p className="stat-hint">
            {currentWeek.remainingDays > 0
              ? t('remaining', { count: currentWeek.remainingDays })
              : t('targetReached')}
          </p>

          <div className="target-selector-group">
            <label htmlFor="weekly-target-select" className="field-label">{t('target')}</label>
            <select
              id="weekly-target-select"
              className="field-select target-select"
              disabled={isUpdatingTarget}
              onChange={handleTargetChange}
              value={currentWeek.targetDays}
            >
              {TARGET_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {formatNumber(locale, days)}
                </option>
              ))}
            </select>
          </div>

          {currentWeek.effectiveTargetNextWeek != null && (
            <p className="effective-target-notice">
              {t('nextTarget', { count: currentWeek.effectiveTargetNextWeek })}
            </p>
          )}
        </div>

        {/* Consistency Streak Card */}
        <div className="engagement-stat-card consistency-streak-card">
          <span className="stat-label">{t('consistency')}</span>
          <strong className="stat-value">
            {t('streak', { count: consistency.currentStreakWeeks })}
          </strong>
          <p className="stat-hint">
            {t('best', { count: consistency.bestStreakWeeks })}
          </p>
          <p className="neutral-subtext">{t('consistencyNote')}</p>
        </div>
      </div>

      {targetError !== null && <div role="alert"><p>{t('updateError')}</p><p>{localizedError(targetError, locale)}</p></div>}
      {/* Evidence of Progress Sub-section */}
      <div className="evidence-progress-section" aria-labelledby="evidence-heading">
        <div className="evidence-header">
          <h3 id="evidence-heading" className="evidence-title">{t('evidence')}</h3>
          <p className="evidence-subtitle">{t('evidenceNote')}</p>
        </div>

        <div className="evidence-summary-chips">
          <span className="summary-chip">
            <strong>{t('sessions', { count: evidenceOfProgress.completedSessions })}</strong>
          </span>
          <span className="summary-chip">
            <strong>{t('studyDays', { count: evidenceOfProgress.distinctStudyDays })}</strong>
          </span>
          <span className="summary-chip">
            <strong>{t('blocks', { count: evidenceOfProgress.evaluatedBlocksCount })}</strong>
          </span>
          <span className="summary-chip">
            <strong>{t('reviews', { count: evidenceOfProgress.completedReviewsCount })}</strong>
          </span>
        </div>

        <div className="evidence-skills-grid">
          {(['reading', 'listening', 'speaking', 'writing'] as const).map((skillKey) => {
            const skill = evidenceOfProgress.skills[skillKey];
            const isInsufficient = skill.status === 'INSUFFICIENT_EVIDENCE';

            return (
              <div key={skillKey} className={`skill-evidence-card skill-${skillKey}`}>
                <div className="skill-card-top">
                  <span className="skill-name">{t(skillKey)}</span>
                  <span className={`status-badge status-${skill.status.toLowerCase()}`}>
                    {t(statusKeys[skill.status])}
                  </span>
                </div>

                <div className="skill-card-score">
                  {isInsufficient ? (
                    <div className="insufficient-evidence-box">
                      <span className="insufficient-label">{t('insufficient')}</span>
                      <span className="sample-count-detail">
                        {t('samples', { count: skill.currentSamples })}
                      </span>
                    </div>
                  ) : (
                    <div className="score-delta-box">
                      <span className="score-delta">
                        {skill.change !== null && (
                          <>
                            {skill.change >= 0 ? '+' : ''}
                            {formatNumber(locale, skill.change * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                          </>
                        )}
                      </span>
                      <span className="sample-count-detail">
                        {t('comparisons', { current: skill.currentSamples, previous: skill.previousSamples })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="evidence-footer">
          <Link href="/mastery" className="mastery-drilldown-link">{t('details')}</Link>
        </div>
      </div>
    </section>
  );
}
