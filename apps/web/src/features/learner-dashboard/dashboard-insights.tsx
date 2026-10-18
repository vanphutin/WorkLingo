'use client';

import type { LearnerDashboardAnalytics } from '@worklingo/contracts';
import Link from 'next/link';
import { localizedError } from '../../i18n/errors';
import { learnerDashboardMessages } from '../../i18n/messages/learnerDashboard';
import { useLocalePreference, useT } from '../../i18n/provider';
import { formatNumber } from '../../i18n/translator';
import styles from './learner-dashboard.module.css';

export interface DashboardInsightsProps {
  readonly analytics?: LearnerDashboardAnalytics | null | undefined;
  readonly analyticsLoading?: boolean | undefined;
  readonly analyticsError?: string | null | undefined;
  readonly onRetryAnalytics?: (() => void) | undefined;
}

export function DashboardInsights({ analytics, analyticsLoading, analyticsError, onRetryAnalytics }: DashboardInsightsProps) {
  const t = useT('learnerDashboard', learnerDashboardMessages);
  const { locale } = useLocalePreference();
  const percent = (value: number) => formatNumber(locale, value, { style: 'percent', maximumFractionDigits: 0 });
  if (analyticsLoading) return <section className="dashboard-card" aria-busy="true"><p role="status">{t('loading')}</p></section>;
  if (analyticsError) return <section className="dashboard-card error-card" role="alert">
    <h2>{t('loadError')}</h2><p>{localizedError(analyticsError, locale)}</p>
    {onRetryAnalytics ? <button className="retry-button" type="button" onClick={onRetryAnalytics}>{t('retry')}</button> : null}
  </section>;
  if (!analytics) return analytics === null ? <section className="dashboard-card"><p>{t('noData')}</p></section> : null;

  const hasActiveProgram = analytics.activeProgramSlug !== null;
  const activity = hasActiveProgram ? analytics.activity : [];
  const accuracy = hasActiveProgram ? analytics.accuracyTrend.filter((point) => point.samples > 0) : [];
  const skills = hasActiveProgram ? analytics.skills.filter((point) => point.samples > 0) : [];
  const sortedSkills = [...skills].sort((a, b) => b.averageScore - a.averageScore);
  const strongest = sortedSkills[0];
  const focus = sortedSkills.at(-1);
  const started = activity.reduce((sum, point) => sum + point.sessions, 0);
  const completed = activity.reduce((sum, point) => sum + point.completedSessions, 0);
  const maximum = Math.max(1, ...activity.map((point) => Math.max(point.sessions, point.completedSessions)));
  const dates = [...new Set([...activity.map((point) => point.dateKey), ...accuracy.map((point) => point.dateKey)])].sort();
  const x = (dateKey: string) => 16 + Math.max(0, dates.indexOf(dateKey)) * (568 / Math.max(1, dates.length - 1));

  return <div className={styles.insights}>
    <section aria-labelledby="learner-programs-heading">
      <div className={styles.sectionHeading}><h2 id="learner-programs-heading">{t('programs')}</h2><Link href="/programs">{t('viewCatalog')}</Link></div>
      <p className={styles.note}>{t('programsNote')}</p>
      <div className={styles.programGrid}>
        {analytics.programs.map((program) => {
          const available = program.availabilityStatus === 'AVAILABLE' || program.availabilityStatus === 'BETA';
          return <article className={`dashboard-card ${styles.programCard}`} key={program.id} aria-label={program.name}>
            <div className={styles.sectionHeading}><h3>{program.name}</h3><span className={styles.badge}>{t(program.availabilityStatus)}</span></div>
            <p className={styles.note}>{program.active ? t('active') : program.enrolled ? t('enrolled') : t('notEnrolled')}</p>
            {program.enrolled ? <>
              <strong>{program.currentLevelCode ?? t('noLevel')}</strong>
              {program.totalLessons > 0 ? <>
                <p>{t('lessons', { completed: program.completedLessons, total: program.totalLessons })}</p>
                <progress className={styles.progress} aria-label={t('lessonCompletion')} value={program.completedLessons} max={program.totalLessons} />
              </> : <p className={styles.note}>{t('noLessons')}</p>}
              {program.totalMissions > 0 ? <p className={styles.note}>{t('missionProgress', { completed: program.completedMissions, total: program.totalMissions })}</p> : null}
            </> : null}
            {available ? <Link href="/programs" className={styles.catalogLink}>{t('manageProgram')}</Link> : null}
          </article>;
        })}
      </div>
      {analytics.programs.length === 0 ? <p>{t('noPrograms')}</p> : null}
    </section>

    <section aria-labelledby="learner-insights-heading">
      <h2 id="learner-insights-heading">{t('insights')}</h2>
      <p className={styles.note}>{hasActiveProgram ? t('period') : t('noActive')}</p>
      <div className={styles.chartGrid}>
        <section className={`dashboard-card ${styles.chartCard}`} aria-labelledby="learner-activity-heading">
          <h3 id="learner-activity-heading">{t('activity')}</h3>
          <p>{t('activitySummary', { started, completed })}</p>
          {started || completed ? <svg className={styles.chart} viewBox="0 0 600 160" aria-hidden="true" focusable="false">
            <line x1="10" x2="590" y1="140" y2="140" className={styles.axis} />
            {activity.map((point, index) => {
              const width = 560 / Math.max(1, activity.length);
              return <g key={point.dateKey}>
                <rect x={20 + index * width} y={140 - point.sessions / maximum * 120} width={width * 0.35} height={point.sessions / maximum * 120} className={styles.bar} />
                <rect x={20 + index * width + width * 0.4} y={140 - point.completedSessions / maximum * 120} width={width * 0.35} height={point.completedSessions / maximum * 120} className={styles.completedBar} />
              </g>;
            })}
          </svg> : <p className={styles.note}>{t('noActivity')}</p>}
          {activity.length > 0 ? <p className={styles.dateRange}>{activity[0]?.dateKey} — {activity.at(-1)?.dateKey}</p> : null}
          <div className={styles.legend} aria-hidden="true"><span>{t('sessions')}</span><span>{t('completedSessions')}</span></div>
          <details><summary>{t('details')}</summary><table className={styles.table}>
            <caption>{t('activity')}</caption><thead><tr><th scope="col">{t('date')}</th><th scope="col">{t('sessions')}</th><th scope="col">{t('completedSessions')}</th></tr></thead>
            <tbody>{activity.map((point) => <tr key={point.dateKey}><th scope="row">{point.dateKey}</th><td>{formatNumber(locale, point.sessions)}</td><td>{formatNumber(locale, point.completedSessions)}</td></tr>)}</tbody>
          </table></details>
        </section>

        <section className={`dashboard-card ${styles.chartCard}`} aria-labelledby="learner-accuracy-heading">
          <h3 id="learner-accuracy-heading">{t('accuracy')}</h3><p className={styles.note}>{t('accuracyNote')}</p>
          {accuracy.length ? <>
            <svg className={styles.chart} viewBox="0 0 600 160" aria-hidden="true" focusable="false">
              <line x1="10" x2="590" y1="140" y2="140" className={styles.axis} />
              {accuracy.map((point, index) => {
                const previous = accuracy[index - 1];
                // Do not imply scores on days without an evaluation.
                const adjacent = previous && Date.parse(`${point.dateKey}T00:00:00Z`) - Date.parse(`${previous.dateKey}T00:00:00Z`) === 86_400_000;
                return <g key={point.dateKey}>
                  {adjacent ? <line x1={x(previous.dateKey)} y1={140 - previous.averageScore * 120} x2={x(point.dateKey)} y2={140 - point.averageScore * 120} className={styles.trend} /> : null}
                  <circle cx={x(point.dateKey)} cy={140 - point.averageScore * 120} r="5" className={styles.bar} />
                </g>;
              })}
              <text x="10" y="14" className={styles.axisLabel}>{percent(1)}</text><text x="10" y="157" className={styles.axisLabel}>{percent(0)}</text>
            </svg>
          </> : <p className={styles.note}>{t('noAccuracy')}</p>}
          {accuracy.length > 0 ? <p className={styles.dateRange}>{dates[0]} — {dates.at(-1)}</p> : null}
          <details><summary>{t('details')}</summary><table className={styles.table}>
            <caption>{t('accuracy')}</caption><thead><tr><th scope="col">{t('date')}</th><th scope="col">{t('score')}</th><th scope="col">{t('samples')}</th></tr></thead>
            <tbody>{accuracy.map((point) => <tr key={point.dateKey}><th scope="row">{point.dateKey}</th><td>{percent(point.averageScore)}</td><td>{formatNumber(locale, point.samples)}</td></tr>)}</tbody>
          </table></details>
        </section>

        <section className={`dashboard-card ${styles.skillCard}`} aria-labelledby="learner-skills-heading">
          <h3 id="learner-skills-heading">{t('skills')}</h3><p className={styles.note}>{t('skillsNote')}</p>
          {skills.length === 0 ? <p>{t('noSkills')}</p> : null}
          {strongest && focus && strongest.averageScore > focus.averageScore ? <div className={styles.skillSummary}>
            <strong>{t('strongest', { skill: t(strongest.skill) })}</strong><span>{t('practiceFocus', { skill: t(focus.skill) })}</span><p className={styles.note}>{t('evidenceNote')}</p>
          </div> : null}
          <table className={styles.table}><caption>{t('skills')}</caption>
            <thead><tr><th scope="col">{t('skill')}</th><th scope="col">{t('score')}</th><th scope="col">{t('samples')}</th></tr></thead>
            <tbody>{(['listening', 'speaking', 'reading', 'writing'] as const).map((key) => {
              const assessment = skills.find((item) => item.skill === key);
              return <tr key={key}><th scope="row">{t(key)}</th><td>{assessment ? <>
                <span>{percent(assessment.averageScore)}</span><span className={styles.skillTrack} aria-hidden="true"><span style={{ width: `${assessment.averageScore * 100}%` }} /></span>
              </> : t('notAssessed')}</td><td>{assessment ? formatNumber(locale, assessment.samples) : '—'}</td></tr>;
            })}</tbody>
          </table>
        </section>
      </div>
      {/ielts|toeic/iu.test(analytics.activeProgramSlug ?? '') ? <p className={styles.note}>{t('examHistory')}</p> : null}
    </section>
  </div>;
}
