'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supportedSessionDurations, type LearnerTopic, type SessionDuration } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';

type PickerProps = { children: ReactNode; initialTopics?: LearnerTopic[] | undefined; initialError?: boolean | undefined };
export function IntermediateTopicPicker({ enabled, contextKey = '', children, initialTopics, initialError }: PickerProps & { enabled: boolean; contextKey?: string }) {
  return enabled ? <PickerSession key={contextKey} initialTopics={initialTopics} initialError={initialError}>{children}</PickerSession> : children;
}
function PickerSession({ children, initialTopics, initialError }: PickerProps) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [topics, setTopics] = useState<LearnerTopic[]>(initialTopics ?? []);
  const [selected, setSelected] = useState(initialTopics?.[0]?.id ?? '');
  const [selectedGroup, setSelectedGroup] = useState(initialTopics?.[0]?.group?.id ?? 'ungrouped');
  const [durationFilter, setDurationFilter] = useState<SessionDuration | 'all'>('all');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initialError ? 'error' : initialTopics ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef<{ mode: string; id: string } | null>(null);
  useEffect(() => {
    live.current = true;
    if (attempt === 0 && (initialTopics !== undefined || initialError)) return () => { live.current = false; };
    let cancelled = false;
    void intermediateTopicClient.list().then(value => {
      if (cancelled) return;
      setTopics(value); setSelected(value[0]?.id ?? ''); setSelectedGroup(value[0]?.group?.id ?? 'ungrouped'); setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; live.current = false; };
  }, [attempt, initialTopics, initialError]);
  const filteredTopics = topics.filter(topic => durationFilter === 'all' || topic.durationMinutes === durationFilter);
  const groups = Array.from(new Map(filteredTopics.flatMap(topic => topic.group ? [[topic.group.id, topic.group] as const] : [])).values());
  const grouped = groups.length > 0;
  const visibleTopics = grouped ? filteredTopics.filter(topic => (topic.group?.id ?? 'ungrouped') === selectedGroup) : filteredTopics;
  function filterByDuration(value: string) {
    const duration = value === 'all' ? 'all' : Number(value) as SessionDuration;
    const first = topics.find(topic => duration === 'all' || topic.durationMinutes === duration);
    setDurationFilter(duration); setSelected(first?.id ?? ''); setSelectedGroup(first?.group?.id ?? 'ungrouped');
    pending.current = null; setFailed(false);
  }
  async function start(random: boolean) {
    if (inFlight.current || !filteredTopics.length || (!random && !visibleTopics.some(topic => topic.id === selected))) return;
    inFlight.current = true; setBusy(true); setFailed(false);
    const mode = `${random ? 'random' : selected}:${durationFilter}`;
    if (pending.current?.mode !== mode) pending.current = { mode, id: crypto.randomUUID() };
    try {
      const session = await intermediateTopicClient.create({ clientSessionId: pending.current.id, ...(!random ? { topicId: selected } : {}), ...(durationFilter !== 'all' ? { durationMinutes: durationFilter } : {}) });
      if (!live.current) return;
      router.push(`/sessions/${session.id}`);
      // Keep locked during navigation to prevent a second start.
      return;
    } catch { if (live.current) setFailed(true); }
    if (live.current) { inFlight.current = false; setBusy(false); }
  }
  return <>
    <section className="session-launcher" aria-label={t('learnerTitle')}>
      <h3>{t('learnerTitle')}</h3>{topics.length > 0 ? <p>{t('learnerHelp')}</p> : null}
      {status === 'loading' ? <p role="status">{t('busy')}</p> : null}
      {status === 'error' ? <div role="alert"><p>{t('loadError')}</p><button type="button" onClick={() => { setStatus('loading'); setAttempt(n => n + 1); }}>{t('retry')}</button></div> : null}
      {failed ? <p role="alert">{t('requestError')}</p> : null}
      {status === 'ready' && !topics.length ? <p>{t('noTopics')}</p> : null}
      {topics.length ? <>
        <label className="field-label">{t('filterTime')}<select className="field-select" value={durationFilter} disabled={busy} onChange={event => filterByDuration(event.target.value)}>
          <option value="all">{t('allTimes')}</option>{supportedSessionDurations.map(minutes => <option key={minutes} value={minutes}>{t('time', { minutes })}</option>)}
        </select></label>
        <p role="status">{t('matchingCount', { count: filteredTopics.length })}</p>
        {filteredTopics.length ? <>
        {grouped ? <>
          <label className="field-label">{tg('chooseGroup')}<select className="field-select" value={selectedGroup} disabled={busy} onChange={event => {
            const groupId = event.target.value;
            setSelectedGroup(groupId); setSelected(filteredTopics.find(topic => (topic.group?.id ?? 'ungrouped') === groupId)?.id ?? '');
            pending.current = null; setFailed(false);
          }}>{groups.map(group => <option key={group.id} value={group.id}>{locale === 'en' && group.nameEn ? group.nameEn : group.name}</option>)}
            {filteredTopics.some(topic => !topic.group) ? <option value="ungrouped">{tg('learnerUngrouped')}</option> : null}
          </select></label>
          {groups.find(group => group.id === selectedGroup)?.description ? <p>{groups.find(group => group.id === selectedGroup)!.description}</p> : null}
          <p>{tg('lessonCount', { count: visibleTopics.length })}</p>
        </> : null}
        <label className="field-label">{tg('chooseLesson')}<select className="field-select" value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); pending.current = null; setFailed(false); }}>
          {visibleTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}{topic.level ? ` · ${topic.level}` : ''} · {t('time', { minutes: topic.durationMinutes })}</option>)}
        </select></label>
        <button type="button" className="primary-action-button" disabled={busy} onClick={() => void start(false)}>{busy ? t('opening') : tg('startLesson')}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void start(true)}>{durationFilter === 'all' ? tg('randomAll') : t('randomFiltered')}</button>
        </> : <p>{t('noTimeMatches')}</p>}
      </> : <p>{t('legacyNotice')}</p>}
    </section>
    {!topics.length ? children : null}
  </>;
}
