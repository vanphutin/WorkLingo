'use client';
import { useAdminDraftGuard } from '../admin-dashboard/admin-navigation-guard';
import { AdminPageHeader } from '../admin-experience/admin-patterns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminLink as Link } from '../admin-dashboard/admin-navigation-guard';
import { ieltsTopicContentSchema, type AdminIeltsTopicDto, type IeltsContentQualificationResult } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsStudyAdminMessages } from '../../i18n/messages/ieltsStudyAdmin';
import { ieltsTopicAdminClient } from '../../lib/api/ielts-topic-admin-client';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';
import { StructuredFields } from '../admin-authoring/structured-fields';
import { JsonTransfer } from '../admin-authoring/json-transfer';
import { AuthoringConfirmation } from '../admin-authoring/authoring-confirmation';
import { newTopicTemplate, topicFields } from './topic-fields';
import '../ielts-introduction/introduction-player.css';
import './topic-editor.css';

export function TopicEditor() {
  const t = useT('ieltsStudyAdmin', ieltsStudyAdminMessages);
  const { locale } = useLocalePreference();
  const [topics, setTopics] = useState<AdminIeltsTopicDto[]>([]);
  const [topic, setTopic] = useState<AdminIeltsTopicDto | null>(null);
  const [content, setContent] = useState<unknown>(null);
  const [savedSource, setSavedSource] = useState('');
  const [importDirty, setImportDirty] = useState(false);
  const [qualification, setQualification] = useState<IeltsContentQualificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [selection, setSelection] = useState<{ next: AdminIeltsTopicDto | null; empty?: boolean } | null>(null);
  const [removing, setRemoving] = useState(false);
  const epoch = useRef(0);
  const loadGeneration = useRef(0);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const dirty = content !== null && (JSON.stringify(content) !== savedSource || importDirty);
  useAdminDraftGuard(dirty);
  const history = !!topic && (topic.versions.length > 0 || topic.currentPublishedVersionId !== null || topic.status === 'PUBLISHED' || topic.status === 'ARCHIVED');
  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setBusy(true);
    try {
      const data = await ieltsTopicAdminClient.list();
      if (generation !== loadGeneration.current) return null;
      setTopics(data); setError(null); return data;
    } catch (cause) { if (generation === loadGeneration.current) setError(cause); return null; }
    finally { if (generation === loadGeneration.current) setBusy(false); }
  }, []);
  useEffect(() => { void load(); return () => { epoch.current++; loadGeneration.current++; }; }, [load]);
  const select = (next: AdminIeltsTopicDto | null, empty = false) => {
    epoch.current++;
    const value = next?.draft ?? (empty ? null : newTopicTemplate());
    setTopic(next); setContent(value); setSavedSource(next ? JSON.stringify(value) : ''); setImportDirty(false);
    setQualification(null); setNotice(''); setError(null); setSelection(null); setRemoving(false); pending.current = null;
  };
  const requestSelection = (next: AdminIeltsTopicDto | null) => {
    if (busy || (next && next.id === topic?.id && next.draftRevision === topic.draftRevision && next.status === topic.status)) return;
    if (dirty) setSelection({ next }); else select(next);
  };
  const retry = async () => {
    const ticket = epoch.current;
    setRemoving(false);
    const data = await load();
    if (!data || ticket !== epoch.current || !topic) return;
    const next = data.find(item => item.id === topic.id) ?? null;
    // Keep the original revision with dirty content until the author explicitly loads the latest.
    if (dirty) setSelection({ next, empty: next === null });
    else select(next, next === null);
  };
  const edit = (next: unknown) => { setContent(next); setQualification(null); setNotice(''); };
  const perform = async (kind: 'save' | 'validate' | 'publish' | 'remove') => {
    if (busy) return;
    const ticket = epoch.current;
    let resultTicket = ticket;
    setBusy(true); setError(null); setNotice('');
    try {
      const expectedAction = history ? 'archived' : 'deleted';
      const signature = JSON.stringify([kind, topic?.id, topic?.draftRevision, content, kind === 'remove' ? expectedAction : null]);
      if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
      const idempotencyKey = pending.current.id;
      if (kind === 'save') {
        ieltsTopicContentSchema.parse(content);
        const next = await ieltsTopicAdminClient.save(topic?.id ?? null, { expectedRevision: topic?.draftRevision ?? null, idempotencyKey, content });
        if (ticket !== epoch.current) return;
        select(next);
        resultTicket = epoch.current;
        setTopics(current => [next, ...current.filter(item => item.id !== next.id)]);
        const refreshed = await ieltsTopicAdminClient.list();
        if (resultTicket === epoch.current) setTopics(refreshed);
      } else if (topic && kind === 'validate') {
        const result = await ieltsTopicAdminClient.validate(topic.id, topic.draftRevision);
        if (ticket === epoch.current) setQualification(result);
      } else if (topic && kind === 'publish' && !dirty && qualification?.canPublish) {
        await ieltsTopicAdminClient.publish(topic.id, { expectedRevision: topic.draftRevision, idempotencyKey });
        if (ticket !== epoch.current) return;
        const refreshed = await ieltsTopicAdminClient.list();
        if (ticket !== epoch.current) return;
        setTopics(refreshed);
        const selected = refreshed.find(item => item.id === topic.id);
        if (selected) { setTopic(selected); setContent(selected.draft); setSavedSource(JSON.stringify(selected.draft)); }
        setQualification(null); setNotice(t('published'));
      } else if (topic && kind === 'remove') {
        const result = await adminContentLifecycleClient.remove('topic', topic.id, { expectedRevision: topic.draftRevision, idempotencyKey, expectedAction });
        if (ticket !== epoch.current) return;
        epoch.current++; resultTicket = epoch.current;
        setTopic(null); setContent(null); setImportDirty(false); setQualification(null); setRemoving(false); setNotice(t(result.action));
        setTopics(current => result.action === 'deleted' ? current.filter(item => item.id !== topic.id)
          : current.map(item => item.id === topic.id ? { ...item, status: 'ARCHIVED', currentPublishedVersionId: null, draftRevision: item.draftRevision + 1 } : item));
        const refreshed = await ieltsTopicAdminClient.list();
        if (resultTicket === epoch.current) setTopics(refreshed);
      }
      pending.current = null;
    } catch (cause) { if (resultTicket === epoch.current) setError(cause); }
    finally { setBusy(false); }
  };
  return <main className="ielts-intro ielts-topic-editor" aria-busy={busy}><AdminPageHeader title={t('title')} description={t('description')} actions={<Link href="/admin/content">{t('lessons')}</Link>} />
    {error ? <div role="alert"><p>{error instanceof Error && error.name === 'ZodError' ? error.message : localizedError(error, locale)}</p><button onClick={() => void retry()} disabled={busy}>{t('retry')}</button></div> : null}
    <div className="ielts-intro__layout"><nav><button type="button" disabled={busy} onClick={() => requestSelection(null)}>{t('new')}</button><ul>{topics.map(item => <li key={item.id}><button type="button" aria-current={topic?.id === item.id ? 'true' : undefined} disabled={busy} onClick={() => requestSelection(item)}>{item.draft.title}</button></li>)}</ul></nav>
      <section>
        {selection ? <AuthoringConfirmation title={t('discardTitle')} description={t('discardHelp')} confirm={t('discard')} cancel={t('keepEditing')} busy={busy} onCancel={() => setSelection(null)} onConfirm={() => select(selection.next, selection.empty)} /> : null}
        {content !== null ? <><p>{topic ? t('revision', { revision: topic.draftRevision }) : t('example')}</p>
          <StructuredFields spec={topicFields} value={content} onChange={edit} locale={locale} disabled={busy} />
          <JsonTransfer key={epoch.current} content={content} schema={ieltsTopicContentSchema} label={t('manifest')} summary={t('transfer')} importLabel={t('import')} exportLabel={t('export')} templateLabel={t('template')} template={newTopicTemplate} locale={locale} disabled={busy} onChange={edit} onDirty={value => { setImportDirty(value); if (value) setQualification(null); }} />
          {dirty ? <p>{t('unsaved')}</p> : null}
          <div className="ielts-intro__links authoring-actions"><button disabled={busy || !dirty || importDirty} onClick={() => void perform('save')}>{t('save')}</button><button disabled={busy || !topic || dirty} onClick={() => void perform('validate')}>{t('validate')}</button><button disabled={busy || dirty || !qualification?.canPublish} onClick={() => void perform('publish')}>{t('publish')}</button>
            {topic ? <button disabled={busy} onClick={() => setRemoving(true)}>{t(history ? 'archive' : 'delete')}</button> : null}</div>
          {removing && topic ? <AuthoringConfirmation title={t('removeTitle', { name: topic.draft.title })} description={t(history ? 'archiveHelp' : 'deleteHelp')} confirm={t(history ? 'confirmArchive' : 'confirmDelete')} cancel={t('cancel')} busy={busy} onCancel={() => setRemoving(false)} onConfirm={() => void perform('remove')} /> : null}
          {qualification ? <div aria-live="polite">{qualification.canPublish ? <><p>{t('ready')}</p><p>{t('durations')}: <strong>{qualification.supportedDurations.join(' / ')}</strong></p></> : <ul>{qualification.issues.map((issue, i) => <li key={`${issue.code}-${i}`}><code>{issue.path}</code><p>{issue.message}</p></li>)}</ul>}</div> : null}
        </> : <p>{busy ? t('loading') : t('choose')}</p>}
        {notice ? <p role="status">{notice}</p> : null}
      </section>
    </div>
  </main>;
}
