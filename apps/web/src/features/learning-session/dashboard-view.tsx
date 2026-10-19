'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import type { Translator } from '../../i18n/translator';
import { learningSessionMessages } from '../../i18n/messages/learningSession';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { LearnerProgressDto } from '../../lib/api/api-client';
import type { CurriculumRoadmapDto, EngagementSummaryDto } from '@worklingo/contracts';
import { EngagementPanel } from '../engagement/engagement-panel';
import { CurriculumRoadmap } from '../curriculum-roadmap/curriculum-roadmap';
import { OrientationDashboardCard } from '../ielts-orientation/orientation-dashboard-card';
import { IeltsBridgeDashboardCard } from '../ielts-bridge/ielts-bridge-dashboard-card';
import { IntegratedPracticeDashboardCard } from '../ielts-integrated/integrated-practice';
import { IeltsMockDashboardCard } from '../ielts-mock/ielts-mock';
import { IeltsBandDashboardCard } from '../ielts-band-curriculum/ielts-band-pathway';
import { DashboardInsights, type DashboardInsightsProps } from '../learner-dashboard/dashboard-insights';
import { learnerDashboardMessages } from '../../i18n/messages/learnerDashboard';
import styles from '../learner-dashboard/learner-dashboard.module.css';
import { IntermediateTopicPicker } from './intermediate-topic-picker';

interface DashboardViewProps extends DashboardInsightsProps {
  readonly progress: LearnerProgressDto | null;
  readonly activeProgramName?: string | undefined;
  readonly activeProgramSlug?: string | null | undefined;
  readonly currentLevelCode?: string | null | undefined;
  readonly nextMissionTitle?: string | undefined;
  readonly availableDurations?: readonly number[] | undefined;
  readonly onStartSession: (
    durationMinutes: number,
    clientSessionId: string,
  ) => Promise<void>;
  readonly isLoading?: boolean | undefined;
  readonly error?: string | null | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly engagement?: EngagementSummaryDto | null | undefined;
  readonly engagementLoading?: boolean | undefined;
  readonly engagementError?: string | null | undefined;
  readonly onRetryEngagement?: (() => void) | undefined;
  readonly onUpdateTarget?: ((targetDays: number) => Promise<void> | void) | undefined;
  readonly roadmap?: CurriculumRoadmapDto | null | undefined;
  readonly roadmapLoading?: boolean | undefined;
  readonly roadmapError?: string | null | undefined;
  readonly onRetryRoadmap?: (() => void) | undefined;
}

const ALL_DURATIONS = [45, 60, 90, 120, 150] as const;
const DEFAULT_DURATIONS = [45, 60] as const;

function getDurationLabel(duration: number, isAvailable: boolean, t: Translator<typeof learningSessionMessages>): string {
  if (!isAvailable) {
    return t('durationUnavailable', { minutes: duration });
  }
  if (duration === 60) return t('durationFoundation');
  if (duration === 45) return t('durationExpress');
  if (duration === 90) return t('durationDeep');
  if (duration === 120) return t('durationIntensive');
  if (duration === 150) return t('durationMastery');
  return t('durationMinutes', { minutes: duration });
}

export function DashboardView({
  progress,
  activeProgramName,
  activeProgramSlug,
  currentLevelCode,
  nextMissionTitle,
  availableDurations = DEFAULT_DURATIONS,
  onStartSession,
  isLoading = false,
  error = null,
  onRetry,
  engagement,
  engagementLoading = false,
  engagementError = null,
  onRetryEngagement,
  onUpdateTarget,
  roadmap,
  roadmapLoading = false,
  roadmapError = null,
  onRetryRoadmap,
  analytics,
  analyticsLoading,
  analyticsError,
  onRetryAnalytics,
}: DashboardViewProps) {
  const t = useT('learningSession', learningSessionMessages);
  const dashboardT = useT('learnerDashboard', learnerDashboardMessages);
  const { locale } = useLocalePreference();
  const [availabilityOverride, setAvailabilityOverride] = useState<{
    source: readonly number[];
    durations: readonly number[];
  } | null>(null);
  const availableDurationsState = availabilityOverride?.source === availableDurations
    ? availabilityOverride.durations : availableDurations;
  const [preferredDuration, setSelectedDuration] = useState<number>(60);
  const selectedDuration = availableDurationsState.includes(preferredDuration)
    ? preferredDuration
    : availableDurationsState.includes(60) ? 60 : availableDurationsState[0] ?? 60;
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<{ cause: unknown } | null>(null);
  const pendingSessionId = useRef<{ id: string; duration: number } | null>(null);
  const resumableMission = roadmap?.items.find((item) => item.state === 'in_progress' && item.activeSessionId);
  const activeProgram = analytics?.programs.find((program) => program.slug === analytics.activeProgramSlug);
  const programName = activeProgram?.name ?? activeProgramName;
  const noActiveProgram = activeProgramSlug === null || analytics?.activeProgramSlug === null;
  const nextMilestone = roadmap?.items.find((item) => item.state === 'in_progress')
    ?? roadmap?.items.find((item) => item.state === 'available');
  useEffect(() => {
    if (pendingSessionId.current?.duration !== selectedDuration) pendingSessionId.current = null;
  }, [selectedDuration]);

  const handleStart = async () => {
    if (isStarting || !availableDurationsState.includes(selectedDuration)) return;
    try {
      setIsStarting(true);
      setStartError(null);
      const clientSessionId = pendingSessionId.current?.duration === selectedDuration
        ? pendingSessionId.current.id : crypto.randomUUID();
      pendingSessionId.current = { id: clientSessionId, duration: selectedDuration };
      await onStartSession(selectedDuration, clientSessionId);
      pendingSessionId.current = null;
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 422) {
        pendingSessionId.current = null;
      }
      if (
        err &&
        typeof err === 'object' &&
        'availableDurations' in err &&
        Array.isArray((err as { availableDurations?: unknown }).availableDurations)
      ) {
        pendingSessionId.current = null;
        const freshAvailable = (err as { availableDurations: number[] }).availableDurations;
        setAvailabilityOverride({ source: availableDurations, durations: freshAvailable });
      }
      setStartError({ cause: err });
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="dashboard-container" aria-busy="true">
        <div className="status-card" role="status">
          <p className="loading-indicator">{t('dashboardLoading')}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-container">
        <div className="status-card error-card" role="alert">
          <h2>{t('dashboardError')}</h2>
          <p className="error-message">{localizedError(error, locale)}</p>
          {onRetry && (
            <button type="button" className="retry-button" onClick={onRetry}>
              {t('retry')}
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      <header className="dashboard-header">
        <span className="eyebrow">{t('learningSpace')}</span>
        <h1 className={`dashboard-title ${styles.welcome}`}>{analytics?.displayName.trim() ? dashboardT('welcome', { name: analytics.displayName.trim() }) : t('todayLearning')}</h1>
        <p className="dashboard-subtitle">
          {t('dashboardDescription')}
        </p>
        <nav className="dashboard-shortcuts" aria-label={t('dashboardShortcuts')}>
          <Link href="/programs">{t('explorePrograms')}</Link>
          <Link href="/mastery">{t('viewMastery')}</Link>
        </nav>
      </header>

      {startError && (
        <div className="form-error" role="alert">
          {localizedError(startError.cause, locale)}
        </div>
      )}

      <div className="dashboard-grid">
        <section className="dashboard-card next-mission-card" aria-labelledby="mission-heading">
          <span className="card-tag">{resumableMission ? t('continueWhereLeft') : t('currentMission')}</span>
          <h2 id="mission-heading" className="mission-title" lang={!noActiveProgram && (resumableMission?.title || nextMissionTitle) ? 'en' : undefined}>
            {noActiveProgram ? dashboardT('chooseProgram') : resumableMission?.title ?? nextMissionTitle ?? dashboardT('chooseMission')}
          </h2>
          <p className="mission-description">
            {t('missionDescription')}
          </p>

          {noActiveProgram ? <Link className="primary-action-button inline-button" href="/programs">{dashboardT('viewCatalog')}</Link> : resumableMission ? (
            <Link className="primary-action-button inline-button" href={`/sessions/${resumableMission.activeSessionId}`}>
              {t('continueSaved')}
            </Link>
          ) : <IntermediateTopicPicker enabled={activeProgramSlug === 'intermediate'} contextKey={currentLevelCode ?? ''}><div className="session-launcher">
            <div className="field-group">
              <label htmlFor="session-duration-select" className="field-label">
                {t('sessionDuration')}
              </label>
              <select
                id="session-duration-select"
                className="field-select"
                value={selectedDuration}
                onChange={(e) => {
                  pendingSessionId.current = null;
                  setSelectedDuration(Number(e.target.value));
                }}
                disabled={isStarting || availableDurationsState.length === 0}
              >
                {ALL_DURATIONS.map((duration) => {
                  const isAvailable = availableDurationsState.includes(duration);
                  return (
                    <option key={duration} value={duration} disabled={!isAvailable}>
                      {getDurationLabel(duration, isAvailable, t)}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              className="primary-action-button"
              onClick={handleStart}
              disabled={isStarting || !availableDurationsState.includes(selectedDuration)}
            >
              {isStarting ? t('startingSession') : t('startSession', { minutes: selectedDuration })}
            </button>
          </div></IntermediateTopicPicker>}
          {!noActiveProgram && !resumableMission && activeProgramSlug !== 'intermediate' && availableDurationsState.length === 0 && (
            <p role="status">{t('noSessions')}</p>
          )}
        </section>

        <section className="dashboard-card progress-card" aria-labelledby="progress-heading">
          <span className="card-tag">{t('progressSummary')}</span>
          <h2 id="progress-heading" className="section-title">
            {t('learningJourney')}
          </h2>

          <div className="progress-stats">
            {programName && !noActiveProgram && <div className="stat-item stat-item-wide">
              <span className="stat-label">{t('activeProgram')} <strong>{programName}</strong></span>
            </div>}
            <div className="stat-item stat-item-wide">
              <span className="stat-label">{t('currentLevel')}</span>
              <strong className="stat-value">{(currentLevelCode !== undefined ? currentLevelCode : analytics ? activeProgram?.currentLevelCode : progress?.currentLevelCode) ?? dashboardT('noLevel')}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">{t('completedActivities')}</span>
              <strong className="stat-value">{progress ? formatNumber(locale, progress.completedActivities) : '—'}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">{t('totalAttempts')}</span>
              <strong className="stat-value">{progress ? formatNumber(locale, progress.activityAttempts) : '—'}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">{t('completedSessions')}</span>
              <strong className="stat-value">{progress ? formatNumber(locale, progress.sessions.completed) : '—'}</strong>
            </div>
          </div>
          {!noActiveProgram && (roadmap !== undefined || analytics) ? <div className={styles.milestone}>
            <span className="stat-label">{dashboardT('nextMilestone')}</span>
            <p>{nextMilestone?.title ?? (roadmap?.items.length && roadmap.items.every((item) => item.state === 'completed') ? dashboardT('milestonesComplete') : dashboardT('noMilestone'))}</p>
            {activeProgram && activeProgram.totalMissions > 0 ? <>
              <p className="neutral-subtext">{dashboardT('missionProgress', { completed: activeProgram.completedMissions, total: activeProgram.totalMissions })}</p>
              <progress className={styles.progress} aria-label={dashboardT('nextMilestone')} value={activeProgram.completedMissions} max={activeProgram.totalMissions} />
            </> : null}
          </div> : null}
        </section>
      </div>

      <DashboardInsights analytics={analytics} analyticsLoading={analyticsLoading} analyticsError={analyticsError} onRetryAnalytics={onRetryAnalytics} />

      {!noActiveProgram && (roadmap !== undefined || roadmapLoading || roadmapError !== null) ? (
        <CurriculumRoadmap
          roadmap={roadmap ?? null}
          isLoading={roadmapLoading}
          error={roadmapError}
          onRetry={onRetryRoadmap}
        />
      ) : null}

      {(engagement !== undefined || engagementLoading || engagementError !== null) && (
        <div>
          <p className="neutral-subtext">{dashboardT('engagementScope')}</p>
          <EngagementPanel
            engagement={engagement ?? null}
            isLoading={engagementLoading}
            error={engagementError}
            onRetry={onRetryEngagement}
            onUpdateTarget={onUpdateTarget ?? (() => {})}
          />
        </div>
      )}
      {!noActiveProgram && programName?.toLowerCase().includes('ielts') ? <section className="learning-pathways" aria-labelledby="learning-pathways-heading">
        <h2 id="learning-pathways-heading">{t('ieltsPathway')}</h2>
        <p className="neutral-subtext">{t('pathwayDescription')}</p>
        <div className="learning-pathways-grid">
          <OrientationDashboardCard />
          <IeltsBridgeDashboardCard />
          <IntegratedPracticeDashboardCard />
          <IeltsBandDashboardCard />
          <IeltsMockDashboardCard />
        </div>
      </section> : null}
    </main>
  );
}
