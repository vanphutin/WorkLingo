'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsMockMessages } from '../../i18n/messages/adminIeltsMock';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import type { MessageValues } from '../../i18n/translator';


import { useEffect, useState } from 'react';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import '../ielts-bridge/ielts-bridge.css';

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
  const [task1, setTask1] = useState<Rubric>([6, 6, 6, 6]);
  const [task2, setTask2] = useState<Rubric>([6, 6, 6, 6]);
  const [speaking, setSpeaking] = useState<Rubric>([6, 6, 6, 6]);
  const [strengths, setStrengths] = useState('');
  const [gaps, setGaps] = useState('');
  const [nextAction, setNextAction] = useState('');
  const rubric = (label: string, values: Rubric, update: (next: Rubric) => void) => (
    <fieldset><legend>{label}</legend>{values.map((value, index) => <label key={index}>{t('criterion', { index: index + 1 })}<input type="number" min="0" max="9" step="0.5" value={value} onChange={(event) => { const next = [...values] as Rubric; next[index] = Number(event.target.value); update(next); }} /></label>)}</fieldset>
  );
  return <article><h3>{t('attempt', { id: attempt.id.slice(0, 8), version: attempt.mockTestVersion.version })}</h3><details><summary>{t('responses')}</summary><pre lang="en">{JSON.stringify(attempt.responses, null, 2)}</pre></details>{rubric(t('writingTask1'), task1, setTask1)}{rubric(t('writingTask2'), task2, setTask2)}{rubric(t('speaking'), speaking, setSpeaking)}<label>{t('strengths')}<textarea value={strengths} onChange={(event) => setStrengths(event.target.value)} /></label><label>{t('gaps')}<textarea value={gaps} onChange={(event) => setGaps(event.target.value)} /></label><label>{t('nextAction')}<textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label><button className="bridge-primary" disabled={busy || !nextAction.trim()} onClick={() => review({ expectedRevision: attempt.revision, idempotencyKey: crypto.randomUUID(), writingTask1: task1, writingTask2: task2, speaking, strengths: strengths.trim() ? [strengths.trim()] : [], gaps: gaps.trim() ? [gaps.trim()] : [], nextActions: [nextAction.trim()] })}>{t('completeReview')}</button></article>;
}

export function IeltsMockWorkspace() {
  const t = useT('adminIeltsMock', adminIeltsMockMessages);
  const { locale } = useLocalePreference();
  const statusLabel = (value: string) => ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED'].includes(value) ? t(value as 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED') : value;
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [nextMockCursor, setNextMockCursor] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAttempt[]>([]);
  const [nextReviewCursor, setNextReviewCursor] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);

  const applyMocks = (page: MockPage, replace: boolean) => {
    setMocks((current) => replace ? page.items : appendUnique(current, page.items));
    setNextMockCursor(page.nextCursor);
    if (replace) {
      const first = page.items[0] ?? null;
      setSelectedMockId(first?.id ?? null);
      setSource(JSON.stringify(first?.draft ?? {}, null, 2));
    }
  };
  const load = () => Promise.all([adminIeltsMockClient.list(), adminIeltsMockClient.pending()]).then(([mockPage, reviewPage]) => {
    applyMocks(mockPage, true);
    setPending(reviewPage.items);
    setNextReviewCursor(reviewPage.nextCursor);
  });
  useEffect(() => { void load().catch(setError).finally(() => setLoading(false)); }, []);

  const mock = mocks.find((item) => item.id === selectedMockId) ?? null;
  const selectMock = (id: string) => {
    const selected = mocks.find((item) => item.id === id) ?? null;
    setIssues([]);
    setSelectedMockId(selected?.id ?? null);
    setSource(JSON.stringify(selected?.draft ?? {}, null, 2));
  };
  const run = (work: () => Promise<unknown>, success: Notice['key']) => {
    setBusy(true); setError(null); setMessage(null); setIssues([]);
    void Promise.resolve().then(work).then(() => load()).then(() => setMessage({ key: success })).catch((cause) => setError(cause)).finally(() => setBusy(false));
  };
  const loadMoreMocks = () => {
    if (nextMockCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.list(nextMockCursor).then((page) => applyMocks(page, false)).catch((cause) => setError(cause)).finally(() => setBusy(false));
  };
  const loadMoreReviews = () => {
    if (nextReviewCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.pending(nextReviewCursor).then((page) => { setPending((current) => appendUnique(current, page.items)); setNextReviewCursor(page.nextCursor); }).catch((cause) => setError(cause)).finally(() => setBusy(false));
  };


  const validateMock = () => {
    if (!mock) return;
    setBusy(true); setError(null); setMessage(null); setIssues([]);
    void adminIeltsMockClient.validate(mock.id, mock.draftRevision).then((result) => {
      setIssues(result.issues);
      setMocks((current) => current.map((item) => item.id === mock.id ? { ...item, status: result.status, draftRevision: result.draftRevision } : item));
      if (result.canPublish) setMessage({ key: 'draftValidated' });
    }).catch(setError).finally(() => setBusy(false));
  };

  if (loading) return <main className="bridge-shell" aria-busy="true"><p role="status">{t('loading')}</p></main>;
  return <main className="bridge-shell">
    <header className="bridge-heading"><div><p className="bridge-kicker">{t('admin')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div></header>
    {error ? <p role="alert" className="bridge-error">{error instanceof SyntaxError ? t('invalidJson') : localizedError(error, locale)}</p> : null}
    {message ? <p role="status" className="bridge-feedback">{t(message.key, message.values)}</p> : null}
    {mock ? <section className="bridge-stage-card">
      <label>{t('selectMock')}<select value={mock.id} onChange={(event) => selectMock(event.target.value)}>{mocks.map((item) => <option key={item.id} value={item.id}>{item.slug}</option>)}</select></label>
      {nextMockCursor !== null ? <button disabled={busy} onClick={loadMoreMocks}>{t('moreMocks')}</button> : null}
      <h2>{mock.slug}</h2>
      <p>{t('status', { status: statusLabel(mock.status), revision: mock.draftRevision, version: mock.currentPublishedVersion ? formatNumber(locale, mock.currentPublishedVersion.version) : t('none') })}</p>
      <label className="bridge-response"><span>{t('source')}</span><textarea lang="en" rows={24} value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} /></label>
      {issues.length > 0 ? <section aria-label={t('validationIssues')} role="alert"><h3>{t('validationIssues')}</h3><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> <span>{locale === 'en' ? issue.message : t('invalidField')}</span></li>)}</ul></section> : null}
      <button disabled={busy} onClick={() => run(() => adminIeltsMockClient.save(mock.id, { expectedRevision: mock.draftRevision, idempotencyKey: crypto.randomUUID(), content: JSON.parse(source) }), 'draftSaved')}>{t('saveDraft')}</button>{' '}
      <button disabled={busy} onClick={validateMock}>{t('validate')}</button>{' '}
      <button className="bridge-primary" disabled={busy || mock.status !== 'VALIDATED'} onClick={() => run(() => adminIeltsMockClient.publish(mock.id, mock.draftRevision), 'published')}>{t('publish')}</button>
    </section> : <p role="status">{t('empty')}</p>}
    <section className="bridge-stage-card">
      <h2>{t('reviewQueue')}</h2>
      {pending.length === 0 ? <p>{t('noReviews')}</p> : pending.map((attempt) => <ReviewForm key={attempt.id} attempt={attempt} busy={busy} review={(input) => run(() => adminIeltsMockClient.review(attempt.id, input), 'reviewed')} />)}
      {nextReviewCursor !== null ? <button disabled={busy} onClick={loadMoreReviews}>{t('moreReviews')}</button> : null}
    </section>
  </main>;
}
