'use client';

import { useEffect, useState } from 'react';
import { adminIeltsMockClient } from '../../lib/api/admin-ielts-mock-client';
import '../ielts-bridge/ielts-bridge.css';

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
  const [task1, setTask1] = useState<Rubric>([6, 6, 6, 6]);
  const [task2, setTask2] = useState<Rubric>([6, 6, 6, 6]);
  const [speaking, setSpeaking] = useState<Rubric>([6, 6, 6, 6]);
  const [strengths, setStrengths] = useState('');
  const [gaps, setGaps] = useState('');
  const [nextAction, setNextAction] = useState('');
  const rubric = (label: string, values: Rubric, update: (next: Rubric) => void) => (
    <fieldset><legend>{label}</legend>{values.map((value, index) => <label key={index}>Criterion {index + 1}<input type="number" min="0" max="9" step="0.5" value={value} onChange={(event) => { const next = [...values] as Rubric; next[index] = Number(event.target.value); update(next); }} /></label>)}</fieldset>
  );
  return <article><h3>Attempt {attempt.id.slice(0, 8)} · version {attempt.mockTestVersion.version}</h3><details><summary>Submitted responses</summary><pre>{JSON.stringify(attempt.responses, null, 2)}</pre></details>{rubric('Writing Task 1', task1, setTask1)}{rubric('Writing Task 2', task2, setTask2)}{rubric('Speaking', speaking, setSpeaking)}<label>Strengths<textarea value={strengths} onChange={(event) => setStrengths(event.target.value)} /></label><label>Gaps<textarea value={gaps} onChange={(event) => setGaps(event.target.value)} /></label><label>Required next action<textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label><button className="bridge-primary" disabled={busy || !nextAction.trim()} onClick={() => review({ expectedRevision: attempt.revision, idempotencyKey: crypto.randomUUID(), writingTask1: task1, writingTask2: task2, speaking, strengths: strengths.trim() ? [strengths.trim()] : [], gaps: gaps.trim() ? [gaps.trim()] : [], nextActions: [nextAction.trim()] })}>Complete teacher review</button></article>;
}

export function IeltsMockWorkspace() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [nextMockCursor, setNextMockCursor] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAttempt[]>([]);
  const [nextReviewCursor, setNextReviewCursor] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load mock workspace.')); }, []);

  const mock = mocks.find((item) => item.id === selectedMockId) ?? null;
  const selectMock = (id: string) => {
    const selected = mocks.find((item) => item.id === id) ?? null;
    setSelectedMockId(selected?.id ?? null);
    setSource(JSON.stringify(selected?.draft ?? {}, null, 2));
  };
  const run = (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null);
    void Promise.resolve().then(work).then(() => load()).then(() => setMessage(success)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Operation failed.')).finally(() => setBusy(false));
  };
  const loadMoreMocks = () => {
    if (nextMockCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.list(nextMockCursor).then((page) => applyMocks(page, false)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load more mocks.')).finally(() => setBusy(false));
  };
  const loadMoreReviews = () => {
    if (nextReviewCursor === null) return;
    setBusy(true); setError(null);
    void adminIeltsMockClient.pending(nextReviewCursor).then((page) => { setPending((current) => appendUnique(current, page.items)); setNextReviewCursor(page.nextCursor); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load more reviews.')).finally(() => setBusy(false));
  };

  return <main className="bridge-shell"><header className="bridge-heading"><div><p className="bridge-kicker">Content Admin</p><h1>IELTS Full Mock Workspace</h1><p>Author immutable Academic mock versions and complete teacher review for Writing and Speaking.</p></div></header>{error ? <p role="alert" className="bridge-error">{error}</p> : null}{message ? <p role="status" className="bridge-feedback">{message}</p> : null}{mock ? <section className="bridge-stage-card"><label>Select mock<select value={mock.id} onChange={(event) => selectMock(event.target.value)}>{mocks.map((item) => <option key={item.id} value={item.id}>{item.slug}</option>)}</select></label>{nextMockCursor !== null ? <button disabled={busy} onClick={loadMoreMocks}>Load more mocks</button> : null}<h2>{mock.slug}</h2><p>Status {mock.status} · draft revision {mock.draftRevision} · published version {mock.currentPublishedVersion?.version ?? 'none'}</p><label className="bridge-response"><span>Format 1 JSON content</span><textarea rows={24} value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} /></label><button disabled={busy} onClick={() => run(() => adminIeltsMockClient.save(mock.id, { expectedRevision: mock.draftRevision, idempotencyKey: crypto.randomUUID(), content: JSON.parse(source) }), 'Draft saved.')}>Save draft</button> <button disabled={busy} onClick={() => run(() => adminIeltsMockClient.validate(mock.id, mock.draftRevision), 'Draft validated.')}>Validate</button> <button className="bridge-primary" disabled={busy || mock.status !== 'VALIDATED'} onClick={() => run(() => adminIeltsMockClient.publish(mock.id, mock.draftRevision), 'Immutable version published.')}>Publish</button></section> : <p role="status">No authored mocks found.</p>}<section className="bridge-stage-card"><h2>Teacher review queue</h2>{pending.length === 0 ? <p>No attempts await review.</p> : pending.map((attempt) => <ReviewForm key={attempt.id} attempt={attempt} busy={busy} review={(input) => run(() => adminIeltsMockClient.review(attempt.id, input), 'Teacher-reviewed report completed.')} />)}{nextReviewCursor !== null ? <button disabled={busy} onClick={loadMoreReviews}>Load more reviews</button> : null}</section></main>;
}
