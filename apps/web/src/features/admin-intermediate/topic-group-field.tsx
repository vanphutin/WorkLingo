'use client';

import { useEffect, useRef, useState } from 'react';
import type { IntermediateTopicGroupCatalog } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { ApiError } from '../../lib/api/api-client';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { AdminLink } from '../admin-dashboard/admin-navigation-guard';
import { matchesTopicGroup, topicGroupLabel } from './topic-group-search';

export function TopicGroupField({ importId, value, onChange, disabled = false, fixed = false, onBusyChange }: {
  importId?: string; value: string; onChange: (id: string) => void; disabled?: boolean; fixed?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT('intermediateGroups', intermediateGroupsMessages);
  const { locale } = useLocalePreference();
  const [catalog, setCatalog] = useState<IntermediateTopicGroupCatalog | null>(null);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'error' | 'conflict' | null>(null);
  const [saved, setSaved] = useState(false);
  const callbacks = useRef({ onChange, onBusyChange }); callbacks.current = { onChange, onBusyChange };
  const live = useRef(false), inFlight = useRef(false);
  useEffect(() => {
    live.current = true; let cancelled = false;
    void topicGroupClient.catalog().then(data => {
      if (cancelled) return;
      setCatalog(data); setLoadFailed(false);
      if (importId) callbacks.current.onChange(data.lessons.find(lesson => lesson.importId === importId)?.groupId ?? '');
      else if (!fixed) {
        const requested = new URLSearchParams(window.location.search).get('topicGroupId');
        if (attempt === 0 && requested && data.groups.some(group => group.id === requested)) callbacks.current.onChange(requested);
      }
    }).catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; live.current = false; };
  }, [attempt, importId, fixed]);

  async function select(next: string) {
    if (!importId) { onChange(next); return; }
    const lesson = catalog?.lessons.find(item => item.importId === importId);
    if (inFlight.current || disabled || !lesson || next === value || error === 'conflict') return;
    inFlight.current = true; setBusy(true); onBusyChange?.(true); setError(null); setSaved(false);
    try {
      const data = await topicGroupClient.assign(importId, { groupId: next || null, expectedRevision: lesson.revision });
      if (live.current) {
        setCatalog(data); onChange(data.lessons.find(item => item.importId === importId)?.groupId ?? ''); setSaved(true);
      }
    } catch (failure) { if (live.current) setError(failure instanceof ApiError && failure.status === 409 ? 'conflict' : 'error'); }
    finally { inFlight.current = false; if (live.current) { setBusy(false); callbacks.current.onBusyChange?.(false); } }
  }
  const matches = catalog?.groups.filter(group => matchesTopicGroup(group, query)) ?? [];
  const options = catalog?.groups.filter(group => matchesTopicGroup(group, query) || group.id === value)
    .sort((a, b) => topicGroupLabel(a, locale).localeCompare(topicGroupLabel(b, locale), locale)) ?? [];
  return <section className="intermediate-card" aria-label={t('lessonTopic')}>
    <h2>{t('lessonTopic')}</h2><p className="intermediate-help">{t(fixed ? 'newMapping' : 'topicFieldHelp')}</p>
    {!catalog && !loadFailed ? <p role="status">{t('loading')}</p> : null}
    {loadFailed ? <div role="status"><p>{t(fixed ? 'loadError' : 'optionalLoadError')}</p><button type="button" disabled={disabled || busy} onClick={() => { setLoadFailed(false); setAttempt(n => n + 1); }}>{t('retry')}</button></div> : null}
    {catalog && fixed ? <><p><strong>{catalog.groups.find(group => group.id === value) ? topicGroupLabel(catalog.groups.find(group => group.id === value)!, locale) : ''}</strong></p>
      <p className="intermediate-help">{t('fixedTopic')}</p></> : catalog ? <>
      <label className="intermediate-field">{t('findTopic')}<input type="search" value={query} onChange={e => setQuery(e.target.value)} disabled={disabled || busy} /></label>
      <label className="intermediate-field">{t('lessonTopic')}<select value={value} disabled={disabled || busy || error === 'conflict' || Boolean(importId && !catalog.lessons.some(l => l.importId === importId))}
        onChange={e => void select(e.target.value)}><option value="">{t('ungrouped')}</option>
        {options.map(group => <option key={group.id} value={group.id}>{topicGroupLabel(group, locale)}</option>)}
      </select></label>
      {query && !matches.length ? <p>{t('noTopicsFound')}</p> : null}
      <p className="intermediate-help">{t(importId ? 'savedMapping' : 'newMapping')}</p>
    </> : null}
    {error ? <p role="alert">{t(error)}</p> : null}
    {error === 'conflict' ? <button type="button" onClick={() => { setError(null); setSaved(false); setAttempt(n => n + 1); }}>{t('reload')}</button> : null}
    {saved ? <p role="status">{t('topicSaved')}</p> : null}
    <AdminLink href="/admin/programs/intermediate/topic-groups">{t(fixed ? 'changeTopic' : 'manageTopics')}</AdminLink>
  </section>;
}
