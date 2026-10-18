'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import type { AdminDashboardOverview } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { formatDate, formatNumber } from '../../i18n/translator';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';
import { commonMessages } from '../../i18n/messages/common';
import { adminDashboardClient } from '../../lib/api/admin-dashboard-client';
import { adminIeltsDestinations, adminProgramDestinations } from './admin-navigation';

type Program = AdminDashboardOverview['programs'][number];
type DashboardState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: AdminDashboardOverview };
const availabilityKeys = { AVAILABLE: 'available', COMING_SOON: 'comingSoon', IN_DEVELOPMENT: 'inDevelopment', BETA: 'beta', DISABLED: 'disabled' } as const;
const sessionStatusKeys = { PLANNED: 'planned', IN_PROGRESS: 'inProgress', PAUSED: 'paused', COMPLETED: 'completed', ABANDONED: 'abandoned' } as const;

export function AdminDashboard({ programSlug }: { readonly programSlug?: string }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void adminDashboardClient.getOverview().then(
      (data) => { if (active) setState({ status: 'ready', data }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt]);

  if (state.status === 'loading') return <div className="ad-panel" role="status">{t('loading')}</div>;
  if (state.status === 'error') return <div className="ad-panel ad-error" role="alert">
    <h1>{t('loadError')}</h1><p>{t('connection')}</p>
    <button className="secondary-button" type="button" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }}>{t('retry')}</button>
  </div>;

  const program = state.data.programs.find((item) => item.slug === programSlug);
  if (programSlug && !program) return <div className="ad-panel"><h1>{t('unavailableProgram')}</h1><p>{t('unavailableDescription')}</p><Link href="/admin">{t('overview')}</Link></div>;
  if (program) return <ProgramWorkspace program={program} />;
  return <div className="ad-dashboard">
    <header className="ad-page-header"><h1>{t('overview')}</h1><p>{t('description')}</p></header>
    <OverviewMetrics data={state.data} />
    <ActivityChart activity={state.data.activity} />
    <ProgramTable programs={state.data.programs} />
    <RecentActivity activity={state.data.recentActivity} />
    <section className="ad-panel"><h2>{t('users')}</h2><p className="ad-muted">{t('usersUnavailable')}</p></section>
  </div>;
}

function OverviewMetrics({ data }: { readonly data: AdminDashboardOverview }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const { locale } = useLocalePreference();
  const metrics = [
    { label: t('totalLearners'), value: formatNumber(locale, data.totalLearners), description: t('learnerDefinition') },
    { label: t('activeLearners'), value: formatNumber(locale, data.activeLearners7d), description: t('activeDefinition') },
    { label: t('enrollments'), value: formatNumber(locale, data.programEnrollments), description: t('enrollmentDefinition') },
    { label: t('completion'), value: percentage(locale, data.sessionCompletionRate), description: data.sessionCompletionRate === null ? t('noSessions') : t('completionDefinition') },
  ];
  return <ul className="ad-metrics" aria-label={t('overviewMetrics')}>{metrics.map((metric) => <li className="ad-metric" key={metric.label}>
    <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.description}</small>
  </li>)}</ul>;
}

function percentage(locale: 'en' | 'vi', value: number | null) {
  return value === null ? '—' : formatNumber(locale, value, { style: 'percent', maximumFractionDigits: 1 });
}

function ProgramTable({ programs }: { readonly programs: AdminDashboardOverview['programs'] }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const { locale } = useLocalePreference();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const id = useId();
  const filtered = programs.filter((program) => `${program.name} ${program.slug} ${programLabel(program.slug)}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)))
    .sort((left, right) => {
      const byName = (programLabel(left.slug) || left.name).localeCompare(programLabel(right.slug) || right.name, locale);
      return sort === 'enrollments' ? right.enrollments - left.enrollments || byName : byName;
    });

  function programLabel(slug: string) {
    const destination = adminProgramDestinations.find((item) => item.slug === slug);
    return destination ? t(destination.label) : '';
  }

  return <section className="ad-panel">
    <div className="ad-section-header"><h2>{t('programPerformance')}</h2><div className="ad-filters">
      <label htmlFor={`${id}-search`}>{t('search')}<input id={`${id}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <label htmlFor={`${id}-sort`}>{t('sort')}<select id={`${id}-sort`} value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="name">{t('sortName')}</option><option value="enrollments">{t('sortEnrollments')}</option>
      </select></label>
    </div></div>
    <div className="ad-table-scroll" role="region" aria-label={t('programPerformance')} tabIndex={0}>
      <table className="content-table ad-table" aria-label={t('programPerformance')}><thead><tr>
        <th scope="col">{t('program')}</th><th scope="col">{t('availability')}</th><th scope="col">{t('enrollments')}</th><th scope="col">{t('publishedMissions')}</th><th scope="col">{t('completion')}</th>
      </tr></thead><tbody>{filtered.map((program) => <tr key={program.id}>
        <th scope="row"><Link href={`/admin/programs/${encodeURIComponent(program.slug)}`}>{programLabel(program.slug) || program.name}</Link></th>
        <td><span className="ad-availability">{t(availabilityKeys[program.availabilityStatus])}</span></td>
        <td>{formatNumber(locale, program.enrollments)}</td><td>{formatNumber(locale, program.publishedMissions)}</td>
        <td>{percentage(locale, program.totalSessions > 0 ? program.completedSessions / program.totalSessions : null)}
          <small className="ad-cell-note">{formatNumber(locale, program.completedSessions)} / {formatNumber(locale, program.totalSessions)}</small></td>
      </tr>)}{filtered.length === 0 ? <tr><td colSpan={5}><p className="ad-empty" role="status">{programs.length === 0 ? t('noPrograms') : t('noMatches')}</p></td></tr> : null}</tbody></table>
    </div>
    <p className="ad-muted ad-footnote">{t('completionDefinition')}</p>
  </section>;
}

function ActivityChart({ activity }: { readonly activity: AdminDashboardOverview['activity'] }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const { locale } = useLocalePreference();
  const max = Math.max(1, ...activity.flatMap((day) => [day.startedSessions, day.completedSessions]));
  const hasActivity = activity.some((day) => day.startedSessions > 0 || day.completedSessions > 0);
  const slot = 500 / Math.max(1, activity.length);
  return <section className="ad-panel">
    <h2>{t('activity')}</h2><p className="ad-muted">{t('activityDescription')}</p>
    {hasActivity ? <>
      <div className="ad-chart-legend"><span><i className="ad-started-swatch" aria-hidden="true" />{t('startedSessions')}</span><span><i className="ad-completed-swatch" aria-hidden="true" />{t('completedSessions')}</span></div>
      <svg className="ad-chart" viewBox="0 0 560 190" role="img" aria-label={t('chartLabel')}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}><line x1="45" x2="550" y1={150 - fraction * 130} y2={150 - fraction * 130} className="ad-chart-grid" />
          <text x="36" y={155 - fraction * 130} textAnchor="end">{formatNumber(locale, max * fraction, { maximumFractionDigits: 1 })}</text></g>)}
        {activity.map((day, index) => <g key={day.dateKey}>
          <rect className="ad-chart-started" x={48 + index * slot} y={150 - day.startedSessions / max * 130} width={slot * 0.3} height={day.startedSessions / max * 130} />
          <rect className="ad-chart-completed" x={48 + index * slot + slot * 0.36} y={150 - day.completedSessions / max * 130} width={slot * 0.3} height={day.completedSessions / max * 130} />
        </g>)}
        <text x="45" y="180">{formatDate(locale, activity[0]!.dateKey, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>
        <text x="550" y="180" textAnchor="end">{formatDate(locale, activity[activity.length - 1]!.dateKey, { month: 'short', day: 'numeric', timeZone: 'UTC' })}</text>
      </svg>
    </> : <p className="ad-empty">{t('noActivity')}</p>}
    {activity.length > 0 ? <details className="ad-chart-data"><summary>{t('viewData')}</summary>
      <div className="ad-table-scroll" role="region" aria-label={t('dailyCounts')} tabIndex={0}><table className="content-table ad-table" aria-label={t('dailyCounts')}><thead><tr><th scope="col">{t('date')}</th><th scope="col">{t('startedSessions')}</th><th scope="col">{t('completedSessions')}</th></tr></thead>
        <tbody>{activity.map((day) => <tr key={day.dateKey}><th scope="row"><time dateTime={day.dateKey}>{formatDate(locale, day.dateKey, { dateStyle: 'medium', timeZone: 'UTC' })}</time></th><td>{formatNumber(locale, day.startedSessions)}</td><td>{formatNumber(locale, day.completedSessions)}</td></tr>)}</tbody>
      </table></div>
    </details> : null}
  </section>;
}

function RecentActivity({ activity }: { readonly activity: AdminDashboardOverview['recentActivity'] }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const { locale } = useLocalePreference();
  return <section className="ad-panel"><h2>{t('recentActivity')}</h2><p className="ad-muted">{t('recentDescription')}</p>
    {activity.length === 0 ? <p className="ad-empty">{t('noRecent')}</p> : <div className="ad-table-scroll" role="region" aria-label={t('recentActivity')} tabIndex={0}>
      <table className="content-table ad-table" aria-label={t('recentActivity')}><thead><tr><th scope="col">{t('mission')}</th><th scope="col">{t('program')}</th><th scope="col">{t('status')}</th><th scope="col">{t('updated')}</th></tr></thead>
        <tbody>{activity.map((item) => <tr key={item.id}><th scope="row">{item.missionTitle}</th><td>{item.programName}</td>
          <td>{t(sessionStatusKeys[item.status as keyof typeof sessionStatusKeys] ?? 'unknownStatus')}</td>
          <td><time dateTime={item.updatedAt}>{formatDate(locale, item.updatedAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })}</time></td></tr>)}</tbody>
      </table></div>}
  </section>;
}

function ProgramWorkspace({ program }: { readonly program: Program }) {
  const t = useT('adminDashboard', adminDashboardMessages);
  const tc = useT('common', commonMessages);
  const { locale } = useLocalePreference();
  const name = adminProgramDestinations.find(({ slug }) => slug === program.slug);
  const metrics = [
    { label: t('enrollments'), value: formatNumber(locale, program.enrollments) },
    { label: t('publishedMissions'), value: formatNumber(locale, program.publishedMissions) },
    { label: t('startedSessions'), value: formatNumber(locale, program.totalSessions) },
    { label: t('completion'), value: percentage(locale, program.totalSessions > 0 ? program.completedSessions / program.totalSessions : null) },
  ];
  const tools = [
    { href: '/admin/curriculum', label: t('paths'), description: t('pathsDescription') },
    { href: '/admin/content', label: t('content'), description: t('contentDescription') },
    { href: '/admin/settings/audio', label: t('audio'), description: t('audioDescription') },
  ];
  return <div className="ad-dashboard">
    <header className="ad-page-header"><p className="ad-eyebrow">{t('learningPrograms')}</p><h1>{name ? t(name.label) : program.name}</h1>
      <span className="ad-availability">{t(availabilityKeys[program.availabilityStatus])}</span><p>{t('workspaceDescription')}</p></header>
    {program.availabilityStatus !== 'AVAILABLE' ? <p className="ad-notice">{t('notReady')}</p> : null}
    <ul className="ad-metrics" aria-label={t('programMetrics')}>{metrics.map((metric) => <li className="ad-metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></li>)}</ul>
    <p className="ad-muted ad-footnote">{program.totalSessions === 0 ? t('noSessions') : t('completionDefinition')}</p>
    <section className="ad-panel"><h2>{t('tools')}</h2><p className="ad-muted">{t('sharedTools')}</p>
      <div className="ad-tool-grid">{tools.map((tool) => <article className="ad-tool" key={tool.href}><h3><Link href={tool.href}>{tool.label}</Link></h3><p>{tool.description}</p></article>)}</div>
    </section>
    {program.slug === 'ielts' ? <section className="ad-panel"><h2>{t('ieltsTools')}</h2><ul className="ad-tool-links">{adminIeltsDestinations.map(({ href, label }) => <li key={href}><Link href={href}>{tc(label)}</Link></li>)}</ul></section> : null}
    <div className="ad-tool-grid"><section className="ad-panel"><h2>{t('assessment')}</h2><p className="ad-muted">{t('assessmentUnavailable')}</p></section>
      <section className="ad-panel"><h2>{t('learnerProgress')}</h2><p className="ad-muted">{t('progressUnavailable')}</p></section></div>
  </div>;
}
