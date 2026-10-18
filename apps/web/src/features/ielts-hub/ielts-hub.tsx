'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { IeltsFlowOverviewDto } from '@worklingo/contracts';
import { ieltsFlowClient } from '../../lib/api/ielts-flow-client';
import { localizedError } from '../../i18n/errors';
import { useT, useLocalePreference } from '../../i18n/provider';
import { ieltsHubMessages } from '../../i18n/messages/ieltsHub';
import { OrientationDashboardCard } from '../ielts-orientation/orientation-dashboard-card';
import { IeltsBridgeDashboardCard } from '../ielts-bridge/ielts-bridge-dashboard-card';
import { IntegratedPracticeDashboardCard } from '../ielts-integrated/integrated-practice';
import { IeltsBandDashboardCard } from '../ielts-band-curriculum/ielts-band-pathway';
import { IeltsMockDashboardCard } from '../ielts-mock/ielts-mock';
import './ielts-hub.css';

const phases = [
  { id: 'orientation', label: 'orientation', Component: OrientationDashboardCard },
  { id: 'bridge', label: 'bridge', Component: IeltsBridgeDashboardCard },
  { id: 'practice', label: 'practice', Component: IntegratedPracticeDashboardCard },
  { id: 'pathway', label: 'pathway', Component: IeltsBandDashboardCard },
  { id: 'mock-tests', label: 'mock', Component: IeltsMockDashboardCard },
] as const;

function LegacyIeltsHub() {
  const t = useT('ieltsHub', ieltsHubMessages);
  return <main className="ielts-hub-shell">
    <header className="ielts-hub-heading">
      <Link href="/programs">{t('programs')}</Link>
      <h1>{t('title')}</h1>
      <p className="ielts-hub-lead">{t('description')}</p>
      <p className="ielts-hub-note">{t('betaNote')}</p>
      <Link href="/dashboard">{t('foundation')}</Link>
    </header>
    <nav className="ielts-hub-navigation" aria-label={t('steps')}>
      <ol>{phases.map((phase, index) => <li key={phase.id}>
        <a href={`#${phase.id}`}><span aria-hidden="true">{index + 1}.</span> {t(phase.label)}</a>
      </li>)}</ol>
    </nav>
    <ol className="ielts-hub-steps" aria-label={t('phaseStates')}>
      {phases.map(({ id, Component }, index) => <li id={id} key={id}>
        <span className="ielts-hub-step-number" aria-hidden="true">{index + 1}</span>
        <Component />
      </li>)}
    </ol>
  </main>;
}

const sections=[{key:'introduction',href:'/ielts/introduction',title:'introductionTitle',description:'introductionDescription',action:'openIntroduction'},{key:'study',href:'/ielts/learn',title:'studyTitle',description:'studyDescription',action:'openStudy'},{key:'mock',href:'/ielts/mock-tests',title:'mockTitle',description:'mockDescription',action:'openMock'}] as const;
export function IeltsHub() {
  const t=useT('ieltsHub',ieltsHubMessages);const {locale}=useLocalePreference();
  const [overview,setOverview]=useState<IeltsFlowOverviewDto|null>(null);const [error,setError]=useState<unknown>(null);const [suggest,setSuggest]=useState(true);
  useEffect(()=>{let active=true;void ieltsFlowClient.overview().then(value=>{if(active)setOverview(value);}).catch(cause=>{if(active)setError(cause);});return()=>{active=false;};},[]);
  if(!overview)return <main className="ielts-hub-shell"><p role={error?'alert':'status'}>{error?localizedError(error,locale):t('loading')}</p></main>;
  if(overview.flowVersion==='legacy')return <LegacyIeltsHub />;
  return <main className="ielts-hub-shell">
    <header className="ielts-hub-heading"><Link href="/programs">{t('programs')}</Link><p className="ielts-hub-kicker">{t('v3Eyebrow')}</p><h1>{t('v3Title')}</h1><p className="ielts-hub-lead">{t('v3Description')}</p><p className="ielts-hub-note">{t('betaNote')}</p></header>
    {suggest?<aside className="ielts-intro-suggestion"><p>{t('suggestIntroduction')}</p><button type="button" aria-label={t('dismissSuggestion')} onClick={()=>setSuggest(false)}>×</button></aside>:null}
    <nav aria-label={t('sections')} className="ielts-hub-navigation"><ul>{sections.map(section=><li key={section.key}><Link href={section.href}>{t(section.title)}</Link></li>)}</ul></nav>
    <div className="ielts-entry-grid">{sections.map((section,index)=><section key={section.key} className="ielts-entry-card"><span className="ielts-entry-index" aria-hidden="true">0{index+1}</span><h2>{t(section.title)}</h2><p>{t(section.description)}</p><div className="ielts-entry-actions">{overview[section.key].resumeHref?<Link className="primary-action-button" href={overview[section.key].resumeHref!}>{t('resumeOwned')}</Link>:null}{overview[section.key].available?<Link className={overview[section.key].resumeHref?'secondary-action-button':'primary-action-button'} href={section.href}>{t(section.action)}</Link>:<p role="status">{t('sectionUnavailable')}</p>}</div></section>)}</div>
    <footer className="ielts-hub-footer"><Link href="/ielts/history">{t('history')}</Link><Link href="/dashboard">{t('foundation')}</Link></footer>
  </main>;
}
