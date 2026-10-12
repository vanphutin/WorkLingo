'use client';

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

const SKILL_NAMES: Record<'listening' | 'reading' | 'speaking' | 'writing', string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
};

function formatStatusLabel(status: EngagementSkillStatus): string {
  switch (status) {
    case 'IMPROVING':
      return 'Improving';
    case 'NEEDS_ATTENTION':
      return 'Needs attention';
    case 'STEADY':
      return 'Steady';
    case 'INSUFFICIENT_EVIDENCE':
      return 'Insufficient evidence';
  }
}

export function EngagementPanel({
  engagement,
  error = null,
  isLoading = false,
  onRetry,
  onUpdateTarget,
}: EngagementPanelProps) {
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  if (isLoading) {
    return (
      <section className="dashboard-card engagement-card" aria-busy="true">
        <p className="loading-indicator">Loading your learning engagement and progress evidence…</p>
      </section>
    );
  }

  if (error || !engagement) {
    return (
      <section className="dashboard-card engagement-card error-card" role="alert">
        <span className="card-tag">Weekly Engagement</span>
        <h2 className="section-title">Unable to load engagement progress</h2>
        <p className="error-message">{error ?? 'No engagement data is currently available.'}</p>
        {onRetry && (
          <button type="button" className="retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </section>
    );
  }

  const { consistency, currentWeek, evidenceOfProgress } = engagement;

  const handleTargetChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTarget = Number(event.target.value);
    try {
      setIsUpdatingTarget(true);
      await onUpdateTarget(newTarget);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  return (
    <section className="dashboard-card engagement-card" aria-labelledby="engagement-heading">
      <span className="card-tag">Weekly Consistency & Progress</span>
      <h2 id="engagement-heading" className="section-title">
        Weekly Mission & Evidence
      </h2>

      <div className="engagement-overview-grid">
        {/* Weekly Mission Card */}
        <div className="engagement-stat-card mission-progress-card">
          <span className="stat-label">This Week</span>
          <strong className="stat-value">
            {currentWeek.completedDays} of {currentWeek.targetDays} learning days
          </strong>
          <p className="stat-hint">
            {currentWeek.remainingDays > 0
              ? `${currentWeek.remainingDays} days remaining this week`
              : 'Weekly target reached'}
          </p>

          <div className="target-selector-group">
            <label htmlFor="weekly-target-select" className="field-label">
              Weekly learning target
            </label>
            <select
              id="weekly-target-select"
              className="field-select target-select"
              disabled={isUpdatingTarget}
              onChange={handleTargetChange}
              value={currentWeek.targetDays}
            >
              {TARGET_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days}
                </option>
              ))}
            </select>
          </div>

          {currentWeek.effectiveTargetNextWeek != null && (
            <p className="effective-target-notice">
              Target will update to {currentWeek.effectiveTargetNextWeek} days next week
            </p>
          )}
        </div>

        {/* Consistency Streak Card */}
        <div className="engagement-stat-card consistency-streak-card">
          <span className="stat-label">Consistency</span>
          <strong className="stat-value">
            {consistency.currentStreakWeeks}-week consistency
          </strong>
          <p className="stat-hint">
            Best: {consistency.bestStreakWeeks} weeks
          </p>
          <p className="neutral-subtext">
            Consistency counts consecutive weeks where you met your target.
          </p>
        </div>
      </div>

      {/* Evidence of Progress Sub-section */}
      <div className="evidence-progress-section" aria-labelledby="evidence-heading">
        <div className="evidence-header">
          <h3 id="evidence-heading" className="evidence-title">
            Evidence of Progress
          </h3>
          <p className="evidence-subtitle">
            Derived from evaluated learning sessions across two 28-day comparison windows.
          </p>
        </div>

        <div className="evidence-summary-chips">
          <span className="summary-chip">
            <strong>{evidenceOfProgress.completedSessions}</strong> sessions
          </span>
          <span className="summary-chip">
            <strong>{evidenceOfProgress.distinctStudyDays}</strong> study days
          </span>
          <span className="summary-chip">
            <strong>{evidenceOfProgress.evaluatedBlocksCount}</strong> language blocks
          </span>
          <span className="summary-chip">
            <strong>{evidenceOfProgress.completedReviewsCount}</strong> reviews
          </span>
        </div>

        <div className="evidence-skills-grid">
          {(['reading', 'listening', 'speaking', 'writing'] as const).map((skillKey) => {
            const skill = evidenceOfProgress.skills[skillKey];
            const isInsufficient = skill.status === 'INSUFFICIENT_EVIDENCE';

            return (
              <div key={skillKey} className={`skill-evidence-card skill-${skillKey}`}>
                <div className="skill-card-top">
                  <span className="skill-name">{SKILL_NAMES[skillKey]}</span>
                  <span className={`status-badge status-${skill.status.toLowerCase()}`}>
                    {formatStatusLabel(skill.status)}
                  </span>
                </div>

                <div className="skill-card-score">
                  {isInsufficient ? (
                    <div className="insufficient-evidence-box">
                      <span className="insufficient-label">Insufficient evidence</span>
                      <span className="sample-count-detail">
                        {skill.currentSamples} recent sample{skill.currentSamples === 1 ? '' : 's'}
                      </span>
                    </div>
                  ) : (
                    <div className="score-delta-box">
                      <span className="score-delta">
                        {skill.change !== null && (
                          <>
                            {skill.change >= 0 ? '+' : ''}
                            {(skill.change * 100).toFixed(1)}%
                          </>
                        )}
                      </span>
                      <span className="sample-count-detail">
                        {skill.currentSamples} recent, {skill.previousSamples} previous samples
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="evidence-footer">
          <Link href="/mastery" className="mastery-drilldown-link">
            Open Mastery Map & Error Bank for detailed skill breakdowns →
          </Link>
        </div>
      </div>
    </section>
  );
}
