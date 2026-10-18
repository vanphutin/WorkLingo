'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AdminIeltsTopicDto, IeltsContentQualificationResult } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsStudyAdminMessages } from '../../i18n/messages/ieltsStudyAdmin';
import { ieltsTopicAdminClient } from '../../lib/api/ielts-topic-admin-client';
import '../ielts-introduction/introduction-player.css';
import './topic-editor.css';

export function TopicEditor() {
  const t = useT('ieltsStudyAdmin', ieltsStudyAdminMessages);
  const { locale } = useLocalePreference();
  const [topics, setTopics] = useState<AdminIeltsTopicDto[]>([]);
  const [topic, setTopic] = useState<AdminIeltsTopicDto | null>(null);
  const [source, setSource] = useState('');
  const [savedSource, setSavedSource] = useState('');
  const [qualification, setQualification] = useState<IeltsContentQualificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const load = useCallback(async () => { setBusy(true); try { setTopics(await ieltsTopicAdminClient.list()); setError(null); } catch (cause) { setError(cause); } finally { setBusy(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const select = (next: AdminIeltsTopicDto | null) => {
    const text = JSON.stringify(next?.draft ?? { schemaVersion: 1, title: '', description: '', packs: [] }, null, 2);
    setTopic(next); setSource(text); setSavedSource(next ? text : ''); setQualification(null); setNotice(''); setError(null); pending.current = null;
  };
  const perform = async (kind: 'save' | 'validate' | 'publish') => {
    setBusy(true); setError(null); setNotice('');
    try {
      const signature = JSON.stringify([kind, topic?.id, topic?.draftRevision, source]);
      if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
      const idempotencyKey = pending.current.id;
      if (kind === 'save') {
        let content: unknown;
        try { content = JSON.parse(source); } catch { setNotice(t('syntax')); return; }
        const next = await ieltsTopicAdminClient.save(topic?.id ?? null, { expectedRevision: topic?.draftRevision ?? null, idempotencyKey, content });
        select(next); setTopics(await ieltsTopicAdminClient.list());
      } else if (topic && kind === 'validate') setQualification(await ieltsTopicAdminClient.validate(topic.id, topic.draftRevision));
      else if (topic) {
        await ieltsTopicAdminClient.publish(topic.id, { expectedRevision: topic.draftRevision, idempotencyKey });
        setNotice(t('published')); setQualification(null); setTopics(await ieltsTopicAdminClient.list());
      }
      pending.current = null;
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  const dirty = source !== savedSource;
  return <main className="ielts-intro ielts-topic-editor"><h1>{t('title')}</h1><p>{t('description')}</p><Link href="/admin/content">{t('lessons')}</Link>
    {error ? <div role="alert"><p>{localizedError(error, locale)}</p><button onClick={() => void load()} disabled={busy}>{t('retry')}</button></div> : null}
    <div className="ielts-intro__layout"><nav><button type="button" disabled={busy} onClick={() => select(null)}>{t('new')}</button><ul>{topics.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => select(item)}>{item.draft.title}</button></li>)}</ul></nav>
      <section>{source ? <><p>{topic ? t('revision', { revision: topic.draftRevision }) : t('new')}</p><label htmlFor="ielts-topic-source">{t('manifest')}</label><textarea id="ielts-topic-source" spellCheck={false} value={source} onChange={event => { setSource(event.target.value); setQualification(null); }} disabled={busy} />
        {dirty ? <p>{t('unsaved')}</p> : null}
        <div className="ielts-intro__links"><button disabled={busy || !dirty} onClick={() => void perform('save')}>{t('save')}</button><button disabled={busy || !topic || dirty} onClick={() => void perform('validate')}>{t('validate')}</button><button disabled={busy || dirty || !qualification?.canPublish} onClick={() => void perform('publish')}>{t('publish')}</button></div>
        {qualification ? <div aria-live="polite">{qualification.canPublish ? <><p>{t('ready')}</p><p>{t('durations')}: <strong>{qualification.supportedDurations.join(' / ')}</strong></p></> : <ul>{qualification.issues.map((issue, i) => <li key={`${issue.code}-${i}`}><code>{issue.path}</code><p>{issue.message}</p></li>)}</ul>}</div> : null}
      </> : <p>{busy ? t('loading') : t('choose')}</p>}{notice ? <p role="status">{notice}</p> : null}</section>
    </div>
  </main>;
}
