'use client';
import { useAdminDraftGuard } from '../admin-dashboard/admin-navigation-guard';
import { AdminPageHeader } from '../admin-experience/admin-patterns';

import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsMockMessages } from '../../i18n/messages/adminIeltsMock';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import type { MessageValues } from '../../i18n/translator';


import { useEffect, useRef, useState } from 'react';
import { ieltsMockContentSchema } from '@worklingo/contracts';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';
import { StructuredFields } from '../admin-authoring/structured-fields';
import { JsonTransfer } from '../admin-authoring/json-transfer';
import { AuthoringConfirmation } from '../admin-authoring/authoring-confirmation';
import { mockFields, newMockTemplate } from './mock-fields';
import '../ielts-bridge/ielts-bridge.css';
import '../admin-content/authoring-experience.css';

type Notice = { key: keyof typeof adminIeltsMockMessages['en']; values?: MessageValues };

type MockPage = Awaited<ReturnType<typeof adminIeltsMockClient.list>>;
type PendingPage = Awaited<ReturnType<typeof adminIeltsMockClient.pending>>;
type Mock = MockPage['items'][number];
type PendingAttempt = PendingPage['items'][number];
type Rubric = [number, number, number, number];

function appendUnique<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
}

function ReviewForm({ attempt, busy, review }: { readonly attempt: PendingAttempt; readonly busy: boolean; readonly review: (input: unknown) => void }) {
  const t = useT('adminIeltsMock', adminIeltsMockMessages);
  const evidenceReady = attempt.policyVersion !== 'v2' || [1, 2, 3].every(part => attempt.recordings?.some(recording => recording.part === part));
  const [task1, setTask1] = useState<Rubric>([6, 6, 6, 6]);
  const [task2, setTask2] = useState<Rubric>([6, 6, 6, 6]);
  const [speaking, setSpeaking] = useState<Rubric>([6, 6, 6, 6]);
  const [strengths, setStrengths] = useState('');
  const [gaps, setGaps] = useState('');
  const [nextAction, setNextAction] = useState('');
  const rubric = (label: string, values: Rubric, update: (next: Rubric) => void) => (
    <fieldset><legend>{label}</legend>{values.map((value, index) => <label key={index}>{t('criterion', { index: index + 1 })}<input type="number" min="0" max="9" step="0.5" value={value} onChange={(event) => { const next = [...values] as Rubric; next[index] = Number(event.target.value); update(next); }} /></label>)}</fieldset>
  );
  return <article><h3>{t('attempt', { id: attempt.id.slice(0, 8), version: attempt.mockTestVersion.version })}</h3><details><summary>{t('responses')}</summary><pre lang="en">{JSON.stringify(attempt.responses, null, 2)}</pre></details>{attempt.recordings?.map(recording => <label key={recording.id}>{t('recordedPart', { part: recording.part })}<audio aria-label={t('recordedPart', { part: recording.part })} controls preload="none" src={`/api/v1/admin/ielts-mock-attempts/${attempt.id}/recordings/${recording.id}/content`} /></label>)}{!evidenceReady ? <p role="alert">{t('missingRecordings')}</p> : null}{rubric(t('writingTask1'), task1, setTask1)}{rubric(t('writingTask2'), task2, setTask2)}{rubric(t('speaking'), speaking, setSpeaking)}<label>{t('strengths')}<textarea value={strengths} onChange={(event) => setStrengths(event.target.value)} /></label><label>{t('gaps')}<textarea value={gaps} onChange={(event) => setGaps(event.target.value)} /></label><label>{t('nextAction')}<textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label><button className="bridge-primary" disabled={busy || !nextAction.trim() || !evidenceReady} onClick={() => review({ expectedRevision: attempt.revision, idempotencyKey: crypto.randomUUID(), writingTask1: task1, writingTask2: task2, speaking, strengths: strengths.trim() ? [strengths.trim()] : [], gaps: gaps.trim() ? [gaps.trim()] : [], nextActions: [nextAction.trim()] })}>{t('completeReview')}</button></article>;
}

export function IeltsMockWorkspace() {
  const t = useT('adminIeltsMock', adminIeltsMockMessages);
  const { locale } = useLocalePreference();
  const statusLabel = (value: string) => ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED'].includes(value) ? t(value as 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED') : value;
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [mock, setMock] = useState<Mock | null>(null);
  const [nextMockCursor, setNextMockCursor] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAttempt[]>([]);
  const [nextReviewCursor, setNextReviewCursor] = useState<string | null>(null);
  const [content, setContent] = useState<unknown>(null);
  const [savedSource, setSavedSource] = useState('');
  const [importDirty, setImportDirty] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ next: Mock | null; empty?: boolean } | null>(null);
  const [removing, setRemoving] = useState(false);
  const epoch = useRef(0);
  const receipt = useRef<{ signature: string; id: string } | null>(null);
  const dirty = content !== null && (JSON.stringify(content) !== savedSource || importDirty);
  useAdminDraftGuard(dirty);
  const history = !!mock && (mock.versions.length > 0 || mock.currentPublishedVersion !== null || mock.status === 'PUBLISHED' || mock.status === 'ARCHIVED');
  const version = content && typeof content === 'object' && 'schemaVersion' in content ? content.schemaVersion : 1;

  const selectMock = (next: Mock | null, empty = false) => {
    epoch.current++;
    const value = next?.draft ?? (empty ? null : newMockTemplate());
    setMock(next); setContent(value); setSavedSource(next ? JSON.stringify(value) : ''); setImportDirty(false);
    setIssues([]); setValidatedRevision(null); setError(null); setMessage(null); setSelection(null); setRemoving(false); receipt.current = null;
  };
  const requestSelection = (next: Mock | null) => {
    if (busy || next !== null && next.id === mock?.id && next.draftRevision === mock.draftRevision && next.status === mock.status) return;
    if (dirty) setSelection({ next }); else selectMock(next);
  };
  const applyMocks = (page: MockPage, replace: boolean) => {
    setMocks(current => replace ? page.items : appendUnique(current, page.items));
    setNextMockCursor(page.nextCursor);
  };
  const refreshMocks = async (selectedId?: string) => {
    let page = await adminIeltsMockClient.list();
    const seen = new Set<string>();
    while (selectedId && !page.items.some(item => item.id === selectedId) && page.nextCursor !== null) {
      if (seen.has(page.nextCursor)) throw new Error('Repeated mock pagination cursor');
      seen.add(page.nextCursor);
      const next = await adminIeltsMockClient.list(page.nextCursor);
      page = { items: appendUnique(page.items, next.items), nextCursor: next.nextCursor };
    }
    applyMocks(page, true);
    return page;
  };
  const refreshReviews = async () => { const page = await adminIeltsMockClient.pending(); setPending(page.items); setNextReviewCursor(page.nextCursor); };
  useEffect(() => {
    let active = true;
    const initialEpoch = epoch.current;
    void Promise.all([adminIeltsMockClient.list(), adminIeltsMockClient.pending()]).then(([mockPage, reviewPage]) => {
      if (!active) return;
      applyMocks(mockPage, true);
      const first = mockPage.items[0];
      if (first && epoch.current === initialEpoch) selectMock(first);
      setPending(reviewPage.items); setNextReviewCursor(reviewPage.nextCursor);
    }).catch(cause => { if (active) setError(cause); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; epoch.current++; };
  }, []);

  const edit = (value: unknown) => { setContent(value); setValidatedRevision(null); setIssues([]); setMessage(null); };
  const author = async (kind: 'save' | 'validate' | 'publish' | 'remove') => {
    if (busy) return;
    const ticket = epoch.current;
    setBusy(true); setError(null); setMessage(null); setIssues([]);
    try {
      const expectedAction = history ? 'archived' : 'deleted';
      const signature = JSON.stringify([kind, mock?.id, mock?.draftRevision, content, kind === 'remove' ? expectedAction : null]);
      if (receipt.current?.signature !== signature) receipt.current = { signature, id: crypto.randomUUID() };
      const idempotencyKey = receipt.current.id;
      if (kind === 'save') {
        ieltsMockContentSchema.parse(content);
        const next = mock ? await adminIeltsMockClient.save(mock.id, { expectedRevision: mock.draftRevision, idempotencyKey, content }) : await adminIeltsMockClient.create({ idempotencyKey, content });
        if (ticket !== epoch.current) return;
        selectMock(next); setMocks(current => [next, ...current.filter(item => item.id !== next.id)]);
        setMessage({ key: 'draftSaved' });
        await refreshMocks(next.id);
      } else if (mock && kind === 'validate' && !dirty) {
        const result = await adminIeltsMockClient.validate(mock.id, mock.draftRevision);
        if (ticket !== epoch.current) return;
        setIssues(result.issues); setMock({ ...mock, status: result.status, draftRevision: result.draftRevision });
        setMocks(current => current.map(item => item.id === mock.id ? { ...item, status: result.status, draftRevision: result.draftRevision } : item));
        setValidatedRevision(result.canPublish ? result.draftRevision : null);
        if (result.canPublish) setMessage({ key: 'draftValidated' });
      } else if (mock && kind === 'publish' && !dirty && validatedRevision === mock.draftRevision) {
        await adminIeltsMockClient.publish(mock.id, mock.draftRevision);
        if (ticket !== epoch.current) return;
        setValidatedRevision(null); setMessage({ key: 'published' });
        const page = await refreshMocks(mock.id);
        if (ticket === epoch.current) { const next = page.items.find(item => item.id === mock.id); if (next) setMock(next); }
      } else if (mock && kind === 'remove') {
        const result = await adminContentLifecycleClient.remove('mock', mock.id, { expectedRevision: mock.draftRevision, idempotencyKey, expectedAction });
        if (ticket !== epoch.current) return;
        epoch.current++; setMock(null); setContent(null); setImportDirty(false); setRemoving(false); setValidatedRevision(null); setMessage({ key: result.action });
        setMocks(current => result.action === 'deleted' ? current.filter(item => item.id !== mock.id)
          : current.map(item => item.id === mock.id ? { ...item, status: 'ARCHIVED', currentPublishedVersion: null, draftRevision: item.draftRevision + 1 } : item));
        await refreshMocks();
      }
      receipt.current = null;
    } catch (cause) {
      // A successful save may advance selection before its list refresh fails.
      if (ticket === epoch.current || kind === 'save' || kind === 'remove') setError(cause);
    } finally { setBusy(false); }
  };
  const runReview = (attempt: PendingAttempt, input: unknown) => {
    setBusy(true); setError(null); setMessage(null);
    void adminIeltsMockClient.review(attempt.id, input).then(refreshReviews).then(() => setMessage({ key: 'reviewed' })).catch(setError).finally(() => setBusy(false));
  };
  const loadMoreMocks = () => {
    if (nextMockCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.list(nextMockCursor).then(page => applyMocks(page, false)).catch(setError).finally(() => setBusy(false));
  };
  const loadMoreReviews = () => {
    if (nextReviewCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.pending(nextReviewCursor).then(page => { setPending(current => appendUnique(current, page.items)); setNextReviewCursor(page.nextCursor); }).catch(setError).finally(() => setBusy(false));
  };
  const retry = () => {
    const ticket = epoch.current;
    setBusy(true); setError(null); setRemoving(false);
    void Promise.allSettled([refreshMocks(mock?.id), refreshReviews()]).then(([mockResult, reviewResult]) => {
      if (ticket !== epoch.current) return;
      if (mockResult.status === 'fulfilled') {
        const page = mockResult.value;
        if (mock) {
          const next = page.items.find(item => item.id === mock.id) ?? null;
          if (dirty) setSelection({ next, empty: next === null });
          else selectMock(next, next === null);
        } else if (content === null && page.items[0]) selectMock(page.items[0]);
      }
      if (mockResult.status === 'rejected') setError(mockResult.reason);
      else if (reviewResult.status === 'rejected') setError(reviewResult.reason);
    }).catch(setError).finally(() => setBusy(false));
  };

  if (loading) return <section className="bridge-shell authoring-experience" aria-busy="true"><p role="status">{t('loading')}</p></section>;
  return <section className="bridge-shell authoring-experience" aria-busy={busy}>
    <AdminPageHeader title={t('title')} description={t('description')} />
    {error ? <div role="alert" className="bridge-error"><p>{error instanceof Error && error.name === 'ZodError' ? error.message : localizedError(error, locale)}</p><button disabled={busy} onClick={retry}>{t('retry')}</button></div> : null}
    {message ? <p role="status" className="bridge-feedback">{t(message.key, message.values)}</p> : null}
    <section className="bridge-stage-card">
      <button type="button" disabled={busy} onClick={() => requestSelection(null)}>{t('newPaper')}</button>
      {mocks.length > 0 || mock ? <label>{t('selectMock')}<select disabled={busy} value={mock?.id ?? ''} onChange={event => { const next = mocks.find(item => item.id === event.target.value); if (next) requestSelection(next); }}>
        <option value="" disabled>{t('choose')}</option>
        {mock && !mocks.some(item => item.id === mock.id) ? <option value={mock.id}>{mock.slug}</option> : null}
        {mocks.map(item => <option key={item.id} value={item.id}>{item.slug}</option>)}
      </select></label> : null}
      {nextMockCursor !== null ? <button disabled={busy} onClick={loadMoreMocks}>{t('moreMocks')}</button> : null}
      {selection ? <AuthoringConfirmation title={t('discardTitle')} description={t('discardHelp')} confirm={t('discard')} cancel={t('keepEditing')} busy={busy} onCancel={() => setSelection(null)} onConfirm={() => selectMock(selection.next, selection.empty)} /> : null}
      {content !== null ? <>
        <h2>{mock?.slug ?? t('newPaper')}</h2>
        {mock ? <p>{t('status', { status: statusLabel(mock.status), revision: mock.draftRevision, version: mock.currentPublishedVersion ? formatNumber(locale, mock.currentPublishedVersion.version) : t('none') })}</p> : <p>{t('example')}</p>}
        <StructuredFields spec={mockFields(version)} value={content} onChange={edit} locale={locale} disabled={busy} />
        <JsonTransfer key={epoch.current} content={content} schema={ieltsMockContentSchema} label={t('source')} summary={t('transfer')} importLabel={t('import')} exportLabel={t('export')} templateLabel={t('template')} template={newMockTemplate} locale={locale} disabled={busy} onChange={edit} onDirty={value => { setImportDirty(value); if (value) setValidatedRevision(null); }} />
        {dirty ? <p>{t('unsaved')}</p> : null}
        {issues.length > 0 ? <section aria-label={t('validationIssues')} role="alert"><h3>{t('validationIssues')}</h3><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> <span>{locale === 'en' ? issue.message : t('invalidField')}</span></li>)}</ul></section> : null}
        <div className="authoring-actions"><button disabled={busy || !dirty || importDirty} onClick={() => void author('save')}>{t(mock ? 'saveDraft' : 'createDraft')}</button>
          <button disabled={busy || !mock || dirty} onClick={() => void author('validate')}>{t('validate')}</button>
          <button className="bridge-primary" disabled={busy || !mock || dirty || validatedRevision !== mock.draftRevision} onClick={() => void author('publish')}>{t('publish')}</button>
          {mock ? <button disabled={busy} onClick={() => setRemoving(true)}>{t(history ? 'archive' : 'delete')}</button> : null}</div>
        {removing && mock ? <AuthoringConfirmation title={t('removeTitle', { name: mock.draft.title })} description={t(history ? 'archiveHelp' : 'deleteHelp')} confirm={t(history ? 'confirmArchive' : 'confirmDelete')} cancel={t('cancel')} busy={busy} onCancel={() => setRemoving(false)} onConfirm={() => void author('remove')} /> : null}
      </> : <p role="status">{t('empty')}</p>}
    </section>
    <section className="bridge-stage-card">
      <h2>{t('reviewQueue')}</h2>
      {pending.length === 0 ? <p>{t('noReviews')}</p> : pending.map(attempt => <ReviewForm key={attempt.id} attempt={attempt} busy={busy} review={input => runReview(attempt, input)} />)}
      {nextReviewCursor !== null ? <button disabled={busy} onClick={loadMoreReviews}>{t('moreReviews')}</button> : null}
    </section>
  </section>;
}
