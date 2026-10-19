'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { LearnerTopic } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';

export function IntermediateTopicPicker({ enabled, contextKey = '', children }: { enabled: boolean; contextKey?: string; children: ReactNode }) {
  return enabled ? <PickerSession key={contextKey}>{children}</PickerSession> : children;
}
function PickerSession({ children }: { children: ReactNode }) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [topics, setTopics] = useState<LearnerTopic[]>([]);
  const [selected, setSelected] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef<{ mode: string; id: string } | null>(null);
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    void intermediateTopicClient.list().then(value => {
      if (cancelled) return;
      setTopics(value); setSelected(value[0]?.id ?? ''); setSelectedGroup(value[0]?.group?.id ?? 'ungrouped'); setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; live.current = false; };
  }, [attempt]);
  const groups = Array.from(new Map(topics.flatMap(topic => topic.group ? [[topic.group.id, topic.group] as const] : [])).values());
  const grouped = groups.length > 0;
  const visibleTopics = grouped ? topics.filter(topic => (topic.group?.id ?? 'ungrouped') === selectedGroup) : topics;
  async function start(random: boolean) {
    if (inFlight.current || !topics.length || (!random && !topics.some(topic => topic.id === selected))) return;
    inFlight.current = true; setBusy(true); setFailed(false);
    const mode = random ? 'random' : selected;
    if (pending.current?.mode !== mode) pending.current = { mode, id: crypto.randomUUID() };
    try {
      const session = await intermediateTopicClient.create({ clientSessionId: pending.current.id, ...(!random ? { topicId: selected } : {}) });
      if (!live.current) return;
      router.push(`/sessions/${session.id}`);
      // Keep locked during navigation to prevent a second start.
      return;
    } catch { if (live.current) setFailed(true); }
    if (live.current) { inFlight.current = false; setBusy(false); }
  }
  return <>
    <section className="session-launcher" aria-label={t('learnerTitle')}>
      <h3>{t('learnerTitle')}</h3><p>{t('learnerHelp')}</p>
      {status === 'loading' ? <p role="status">{t('busy')}</p> : null}
      {status === 'error' ? <div role="alert"><p>{t('loadError')}</p><button type="button" onClick={() => { setStatus('loading'); setAttempt(n => n + 1); }}>{t('retry')}</button></div> : null}
      {failed ? <p role="alert">{t('requestError')}</p> : null}
      {status === 'ready' && !topics.length ? <p>{t('noTopics')}</p> : null}
      {topics.length ? <>
        {grouped ? <>
          <label className="field-label">{tg('chooseGroup')}<select className="field-select" value={selectedGroup} disabled={busy} onChange={event => {
            const groupId = event.target.value;
            setSelectedGroup(groupId); setSelected(topics.find(topic => (topic.group?.id ?? 'ungrouped') === groupId)?.id ?? '');
            pending.current = null; setFailed(false);
          }}>{groups.map(group => <option key={group.id} value={group.id}>{locale === 'en' && group.nameEn ? group.nameEn : group.name}</option>)}
            {topics.some(topic => !topic.group) ? <option value="ungrouped">{tg('learnerUngrouped')}</option> : null}
          </select></label>
          {groups.find(group => group.id === selectedGroup)?.description ? <p>{groups.find(group => group.id === selectedGroup)!.description}</p> : null}
          <p>{tg('lessonCount', { count: visibleTopics.length })}</p>
        </> : null}
        <label className="field-label">{tg('chooseLesson')}<select className="field-select" value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); pending.current = null; setFailed(false); }}>
          {visibleTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.title} · {t('time', { minutes: topic.durationMinutes })}</option>)}
        </select></label>
        <button type="button" className="primary-action-button" disabled={busy} onClick={() => void start(false)}>{busy ? t('opening') : tg('startLesson')}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void start(true)}>{tg('randomAll')}</button>
      </> : <p>{t('legacyNotice')}</p>}
    </section>
    {!topics.length ? children : null}
  </>;
}
