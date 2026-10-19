'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useT } from '../../i18n/provider';
import { learnerDashboardMessages } from '../../i18n/messages/learnerDashboard';
import styles from './learner-dashboard.module.css';

const sections = ['home', 'progress', 'programs', 'weekly'] as const;
type Section = typeof sections[number];
const labels = { home: 'tabToday', progress: 'tabProgress', programs: 'tabPrograms', weekly: 'tabWeekly' } as const;

export function DashboardSections(content: Record<Section, ReactNode>) {
  const t = useT('learnerDashboard', learnerDashboardMessages);
  const [active, setActive] = useState<Section>('home');
  const [visited, setVisited] = useState<Section[]>(['home']);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  function show(section: Section) {
    setActive(section);
    setVisited(previous => previous.includes(section) ? previous : [...previous, section]);
  }
  useEffect(() => {
    function readHash() {
      const hash = window.location.hash.slice(1);
      show(sections.find(section => section === hash) ?? 'home');
    }
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);
  function select(section: Section) {
    show(section);
    const url = new URL(window.location.href);
    url.hash = section === 'home' ? '' : section;
    window.history.replaceState(window.history.state, '', url);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % sections.length
      : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    select(sections[next]!);
    tabs.current[next]?.focus();
  }
  return <>
    <div className={styles.sectionTabs} role="tablist" aria-label={t('sectionNavigation')}>
      {sections.map((section, index) => <button key={section} type="button" role="tab"
        id={`dashboard-tab-${section}`} aria-controls={`dashboard-panel-${section}`}
        aria-selected={active === section} tabIndex={active === section ? 0 : -1}
        ref={element => { tabs.current[index] = element; }}
        onClick={() => select(section)} onKeyDown={event => navigate(event, index)}>{t(labels[section])}</button>)}
    </div>
    {sections.map(section => <section key={section} role="tabpanel" className={styles.panel}
      id={`dashboard-panel-${section}`} aria-labelledby={`dashboard-tab-${section}`}
      hidden={active !== section} tabIndex={0}>
      {visited.includes(section) ? content[section] : null}
    </section>)}
  </>;
}
