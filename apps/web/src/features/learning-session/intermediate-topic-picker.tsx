'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { LearnerTopic } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';

export function IntermediateTopicPicker({ enabled, contextKey = '', children }: { enabled: boolean; contextKey?: string; children: ReactNode }) {
  return enabled ? <PickerSession key={contextKey}>{children}</PickerSession> : children;
}
function PickerSession({ children }: { children: ReactNode }) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const router = useRouter();
  const [topics, setTopics] = useState<LearnerTopic[]>([]);
  const [selected, setSelected] = useState('');
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
      setTopics(value); setSelected(value[0]?.id ?? ''); setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; live.current = false; };
  }, [attempt]);
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
        <label className="field-label">{t('choose')}<select className="field-select" value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); pending.current = null; setFailed(false); }}>
          {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title} · {t('time', { minutes: topic.durationMinutes })}</option>)}
        </select></label>
        <button type="button" className="primary-action-button" disabled={busy} onClick={() => void start(false)}>{t(busy ? 'opening' : 'start')}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void start(true)}>{t('random')}</button>
      </> : <p>{t('legacyNotice')}</p>}
    </section>
    {!topics.length ? children : null}
  </>;
}
