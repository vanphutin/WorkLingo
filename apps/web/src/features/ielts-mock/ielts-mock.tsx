'use client';

import type { IeltsMockAttemptDto, IeltsMockReportDto, MockSectionReviewDto, IeltsMockRecordingDto } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsMockMessages } from '../../i18n/messages/ieltsMock';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ieltsMockClient } from '../../lib/api/ielts-mock-client';
import '../ielts-bridge/ielts-bridge.css';
import { MockAudioPlayer } from './mock-audio-player';
import { MockSpeakingRecorder } from './mock-speaking-recorder';
import { MockTaskPrompt } from './mock-task-prompt';
import { MockPreflight } from './mock-preflight';

const formatTime = (milliseconds: number) => { const seconds = Math.max(0, Math.ceil(milliseconds / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };

export function IeltsMockCatalog() {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof ieltsMockClient.catalog>> | null>(null);
  const [mode, setMode] = useState<IeltsMockAttemptDto['mode'] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [preflightId, setPreflightId] = useState<string | null>(null);
  const pending = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => { void ieltsMockClient.catalog().then(setCatalog).catch(setError); }, []);
  const v3 = catalog?.flowVersion === 'v3';
  const choices = (v3 ? ['PRACTICE', 'EXAM_SIMULATION'] : ['LEARNING', 'PRACTICE', 'EXAM_SIMULATION']) as IeltsMockAttemptDto['mode'][];
  const available = choices.filter(candidate => catalog?.mocks.some(mock => mock.allowedModes.includes(candidate)));
  const requested = mode ?? (v3 ? 'PRACTICE' : 'EXAM_SIMULATION');
  const selectedMode = available.includes(requested) ? requested : available[0] ?? 'PRACTICE';
  const begin = async (mockTestId: string) => {
    const key = `${mockTestId}:${selectedMode}`;
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    setBusy(true); setError(null);
    try { const attempt = await ieltsMockClient.start({ clientAttemptId: pending.current.id, mockTestId, mode: selectedMode }); router.push(`/ielts/mock-tests/${attempt.id}`); }
    catch (cause) { setError(cause); setBusy(false); }
  };
  return <main className="bridge-shell"><header className="bridge-heading"><div><Link href="/ielts">{t('ieltsHome')}</Link><p className="bridge-kicker">{t('academic')}</p><h1>{t('catalogTitle')}</h1><p>{t('description')}</p></div></header>
    {error ? <p role="alert" className="bridge-error">{localizedError(error, locale)}</p> : null}
    {!catalog && !error ? <p role="status">{t('loading')}</p> : null}
    {catalog && (v3 || catalog.eligible) ? <><label>{t('testMode')}<select disabled={busy} value={selectedMode} onChange={event => { setMode(event.target.value as typeof mode); setPreflightId(null); }}>{(v3 ? choices : available).map(candidate => <option key={candidate} value={candidate} disabled={!available.includes(candidate)}>{t(candidate)}</option>)}</select></label>{v3 ? <><p>{t(selectedMode === 'PRACTICE' ? 'practiceRules' : 'simulationRules')}</p>{!available.includes('EXAM_SIMULATION') ? <p>{t('simulationUnavailable')}</p> : null}</> : null}</> : null}
    {catalog && !catalog.eligible ? <section className="bridge-stage-card"><h2>{t('locked')}</h2><p>{catalog.lockedReason === 'BAND_PATHWAY_REQUIRED' ? t('bandRequired') : t('notPublished')}</p></section> : null}
    {catalog?.eligible ? <>{!catalog.mocks.length ? <p role="status">{t('emptyMocks')}</p> : null}{catalog.mocks.map(mock => <section className="bridge-stage-card" key={mock.id}><p className="bridge-kicker">{t('catalogMeta', { variant: t(mock.variant), version: formatNumber(locale, mock.version) })}</p><h2 lang="en">{mock.title}</h2>{mock.activeAttemptId ? <Link className="bridge-primary" href={`/ielts/mock-tests/${mock.activeAttemptId}`}>{t('resume')}</Link> : <button className="bridge-primary" disabled={busy || !mock.allowedModes.includes(selectedMode)} onClick={() => v3 ? setPreflightId(mock.id) : void begin(mock.id)}>{busy ? t('starting') : t('start')}</button>}</section>)}</> : null}
    {preflightId ? <MockPreflight busy={busy} strict={selectedMode === 'EXAM_SIMULATION'} onStart={() => void begin(preflightId)} onCancel={() => setPreflightId(null)} /> : null}
  </main>;
}

function Report({ report }: { readonly report: IeltsMockReportDto }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference(); return <main className="bridge-shell bridge-state"><p className="bridge-kicker">{t('report')}</p><h1>{report.status === 'COMPLETED' ? t('overallBand', { band: report.overallMockBand === null ? '—' : formatNumber(locale, report.overallMockBand) }) : t('reviewPending')}</h1><p lang="en">{report.disclosure}</p><ul>{Object.entries(report.skills).map(([skill, result]) => <li key={skill}><strong>{t(skill as keyof typeof report.skills)}</strong>: {result.mockBand === null ? t(result.status) : formatNumber(locale, result.mockBand)}</li>)}</ul>{report.nextActions.length ? <><h2>{t('nextActions')}</h2><ul>{report.nextActions.map((action) => <li key={action}>{action === 'Wait for teacher review of Writing and Speaking.' ? t('waitReview') : <span lang="en">{action}</span>}</li>)}</ul></> : null}<Link className="bridge-primary" href="/ielts/mock-tests">{t('back')}</Link></main>; }

function ListeningAudio({ part, mode }: { readonly part: IeltsMockAttemptDto['sectionContent']['listening'][number]; readonly mode: IeltsMockAttemptDto['mode'] }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const [completed, setCompleted] = useState(false); const furthestTime = useRef(0); if (completed) return <p>{t('listeningComplete', { part: formatNumber(locale, part.part) })}</p>;
  return <audio aria-label={t('listeningPart', { part: formatNumber(locale, part.part) })} controls controlsList={mode === 'EXAM_SIMULATION' ? 'nodownload noplaybackrate' : undefined} preload={mode === 'EXAM_SIMULATION' ? 'none' : 'metadata'} src={part.audioUrl} onContextMenu={mode === 'EXAM_SIMULATION' ? (event) => event.preventDefault() : undefined} onTimeUpdate={(event) => { if (mode === 'EXAM_SIMULATION' && !event.currentTarget.seeking) furthestTime.current = Math.max(furthestTime.current, event.currentTarget.currentTime); }} onSeeking={(event) => { if (mode === 'EXAM_SIMULATION' && Math.abs(event.currentTarget.currentTime - furthestTime.current) > 0.5) event.currentTarget.currentTime = furthestTime.current; }} onEnded={() => { if (mode === 'EXAM_SIMULATION') setCompleted(true); }}>{t('listeningPart', { part: formatNumber(locale, part.part) })}</audio>;
}

export function IeltsMockPlayer({ attemptId }: { readonly attemptId: string }) {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference();
  const [attempt, setAttempt] = useState<IeltsMockAttemptDto | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [report, setReport] = useState<IeltsMockReportDto | null>(null);
  const [recordings, setRecordings] = useState<IeltsMockRecordingDto[]>([]);
  const [review, setReview] = useState<MockSectionReviewDto | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const synchronizedAt = useRef(Date.now());
  const expiryRetryAt = useRef(0);
  const pendingClock = useRef<{ key: string; id: string } | null>(null);
  const recover = async (cause:unknown) => { setError(cause); try { const current=await ieltsMockClient.get(attemptId); synchronizedAt.current=Date.now(); setAttempt(current); if(current.currentSection==='COMPLETE')setReport(await ieltsMockClient.report(attemptId)); } catch { /* Keep the local draft and retry the operation when connectivity returns. */ } };
  const apply = (value: IeltsMockAttemptDto) => { synchronizedAt.current = Date.now(); setAttempt(value); };
  useEffect(() => { let active = true; void ieltsMockClient.get(attemptId).then(async value => { if (!active) return; synchronizedAt.current = Date.now(); setAttempt(value); setDrafts(value.responses); if (value.currentSection === 'COMPLETE') setReport(await ieltsMockClient.report(attemptId)); }).catch(cause => { if (active) setError(cause); }); return () => { active = false; }; }, [attemptId]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (attempt?.policyVersion === 'v2' && attempt.currentSection === 'SPEAKING') void ieltsMockClient.recordings(attemptId).then(setRecordings).catch(setError); }, [attempt?.currentSection, attempt?.policyVersion, attemptId]);
  const practice = attempt?.policyVersion === 'v2' && attempt.mode === 'PRACTICE';
  const remaining = attempt ? new Date(attempt.sectionDeadlineAt).getTime() - clock : 0;
  const paused = !!attempt?.pausedAt;
  const canWork = !paused && (practice || remaining > 0);
  const fields = useMemo<Array<{ id: string; label: string; options: string[]; order?: number; minimumWords?: number }>>(() => {
    if (!attempt) return [];
    if (attempt.currentSection === 'LISTENING') return attempt.sectionContent.listening.flatMap(part => part.questions.map(item => ({ id: item.id, label: item.prompt, order: item.order, options: item.options })));
    if (attempt.currentSection === 'READING') return attempt.sectionContent.reading.flatMap(passage => passage.questions.map(item => ({ id: item.id, label: item.prompt, order: item.order, options: item.options })));
    if (attempt.currentSection === 'WRITING') return attempt.sectionContent.writing.map(item => ({ id: `writing-${item.task}`, label: item.title, minimumWords: item.minimumWords, options: [] }));
    if (attempt.currentSection === 'SPEAKING' && attempt.policyVersion !== 'v2') return attempt.sectionContent.speaking.map(item => ({ id: `speaking-${item.part}`, label: `${item.title} — ${item.prompts.join(' ')}`, options: [] }));
    return [];
  }, [attempt]);
  useEffect(() => {
    if (!attempt || busy || !canWork || !fields.some(field => (drafts[field.id] ?? '') !== (attempt.responses[field.id] ?? ''))) return;
    const timer = window.setTimeout(() => { setBusy(true); void ieltsMockClient.save(attemptId, { expectedRevision: attempt.revision, responses: Object.fromEntries(fields.map(field => [field.id, drafts[field.id] ?? ''])) }).then(value => { synchronizedAt.current = Date.now(); setAttempt(value); }).catch(recover).finally(() => setBusy(false)); }, 800);
    return () => window.clearTimeout(timer);
  }, [attempt, attemptId, busy, canWork, drafts, fields]);
  useEffect(() => {
    if (!attempt || attempt.policyVersion !== 'v2' || attempt.mode !== 'EXAM_SIMULATION' || attempt.currentSection === 'COMPLETE' || remaining > 0 || busy || clock < expiryRetryAt.current) return;
    expiryRetryAt.current = clock + 3000; setBusy(true);
    void ieltsMockClient.get(attemptId).then(async value => { synchronizedAt.current = Date.now(); setAttempt(value); setDrafts(value.responses); if (value.currentSection === 'COMPLETE') setReport(await ieltsMockClient.report(attemptId)); }).catch(setError).finally(() => setBusy(false));
  }, [attempt, attemptId, busy, clock, remaining]);
  if (report) return <Report report={report} />;
  if (!attempt) return <main className="bridge-shell bridge-state"><p role={error ? 'alert' : 'status'}>{error ? localizedError(error, locale) : t('restoring')}</p></main>;
  if (attempt.currentSection === 'COMPLETE') return <main className="bridge-shell bridge-state"><p>{t('loadingReport')}</p>{error ? <p role="alert">{localizedError(error, locale)}</p> : null}</main>;
  const save = async () => { try { const value = await ieltsMockClient.save(attemptId, { expectedRevision: attempt.revision, responses: Object.fromEntries(fields.map(field => [field.id, drafts[field.id] ?? ''])) }); apply(value); return value; } catch(cause) { await recover(cause); throw cause; } };
  const togglePause = async () => {
    setBusy(true); setError(null);
    try {
      const dirty = fields.some(field => (drafts[field.id] ?? '') !== (attempt.responses[field.id] ?? ''));
      const current = !paused && dirty ? await save() : attempt;
      const key = `${current.id}:${paused ? 'resume' : 'pause'}:${current.revision}`;
      if (pendingClock.current?.key !== key) pendingClock.current = { key, id: crypto.randomUUID() };
      const input = { expectedRevision: current.revision, clientOperationId: pendingClock.current.id };
      apply(await (paused ? ieltsMockClient.resume(attemptId, input) : ieltsMockClient.pause(attemptId, input)));
      pendingClock.current = null;
    } catch (cause) { await recover(cause); } finally { setBusy(false); }
  };
  const showReview = async (section: string) => { setBusy(true); setError(null); try { setReview(await ieltsMockClient.review(attemptId, section)); } catch (cause) { await recover(cause); } finally { setBusy(false); } };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const saved = canWork && fields.length ? await save() : attempt;
      const value = await ieltsMockClient.submit(attemptId, saved.currentSection, saved.revision);
      apply(value); setDrafts(value.responses);
      if (practice && ['LISTENING', 'READING'].includes(saved.currentSection)) setReview(await ieltsMockClient.review(attemptId, saved.currentSection));
      if (value.currentSection === 'COMPLETE') setReport(await ieltsMockClient.report(attemptId));
    } catch (cause) { await recover(cause); } finally { setBusy(false); }
  };
  return <main className="bridge-shell"><header className="bridge-heading"><div><Link href="/ielts/mock-tests">{t('back')}</Link><p className="bridge-kicker">{t('attemptMeta',{version:formatNumber(locale,attempt.mockTestVersion),mode:t(attempt.mode)})}</p><h1 lang="en">{attempt.title}</h1></div></header><article className="bridge-stage-card">
    <p className="bridge-kicker">{t(attempt.currentSection)}</p><h2>{t('sectionTitle', { skill: t(attempt.currentSection) })}</h2>
    <p role="timer" className="bridge-timer">{practice ? t('elapsedTime', { time: formatTime(attempt.elapsedMs + (paused ? 0 : Math.max(0, clock - synchronizedAt.current))) }) : remaining > 0 ? t('remainingTime', { time: formatTime(remaining) }) : t('expired')}</p>
    {practice ? <><button type="button" disabled={busy} onClick={() => void togglePause()}>{t(paused ? 'resumePractice' : 'pausePractice')}</button>{paused ? <p role="status">{t('paused')}</p> : null}<div>{attempt.submittedSections.filter(section => section === 'LISTENING' || section === 'READING').map(section => <button key={section} type="button" disabled={busy} onClick={() => void showReview(section)}>{t('reviewSection', { section: t(section as 'LISTENING' | 'READING') })}</button>)}</div></> : null}
    {review ? <details open><summary>{t('sectionFeedback')} · {t(review.section)}</summary>{review.transcripts.map(item => <section key={item.part}><h3>{t('transcript')} {item.part}</h3><p lang="en">{item.text}</p></section>)}<ol>{review.questions.map(question => <li key={question.id}><p lang="en">{question.prompt}</p><p>{t('correctAnswer')}: <span lang="en">{question.acceptedAnswers.join(' / ')}</span></p><p lang="en">{question.explanation}</p></li>)}</ol></details> : null}
    {attempt.currentSection === 'LISTENING' ? attempt.sectionContent.listening.map(part => attempt.policyVersion === 'v2' ? <MockAudioPlayer key={part.part} attemptId={attemptId} assetId={part.audioAssetId ?? part.audioUrl.split('/').at(-1)!} part={part.part} strict={attempt.mode === 'EXAM_SIMULATION'} paused={!canWork} /> : <ListeningAudio key={part.part} part={part} mode={attempt.mode} />) : null}
    {attempt.currentSection === 'READING' ? attempt.sectionContent.reading.map(passage => <section key={passage.section}><h3 lang="en">{passage.title}</h3><p lang="en">{passage.passage}</p></section>) : null}
    {attempt.currentSection === 'SPEAKING' && attempt.policyVersion === 'v2' ? attempt.sectionContent.speaking.map(part => <MockSpeakingRecorder key={part.part} attemptId={attemptId} part={part} paused={!canWork} saved={recordings.find(recording => recording.part === part.part)} onSaved={recording => setRecordings(current => [...current.filter(item => item.part !== recording.part), recording])} />) : null}
    {attempt.currentSection === 'WRITING' ? attempt.sectionContent.writing.map(task=><section key={task.task}><h3 lang="en">{task.title}</h3><MockTaskPrompt prompt={task.prompt} /></section>):null}
    {fields.map(field => <label className="bridge-response" key={field.id}><span lang="en">{field.order ? `${formatNumber(locale, field.order)}. ` : null}{field.label}</span>{field.minimumWords ? <small>{t('minimumWords', { count: formatNumber(locale, field.minimumWords) })}</small> : null}{field.options.length ? <select disabled={!canWork} value={drafts[field.id] ?? ''} onChange={event => setDrafts({ ...drafts, [field.id]: event.target.value })}><option value="">{t('selectAnswer')}</option>{field.options.map(option => <option key={option} lang="en">{option}</option>)}</select> : <textarea lang="en" disabled={!canWork} rows={attempt.currentSection === 'WRITING' ? 12 : 4} value={drafts[field.id] ?? ''} onChange={event => setDrafts({ ...drafts, [field.id]: event.target.value })} />}</label>)}
    {error ? <p role="alert" className="bridge-error">{localizedError(error, locale)}</p> : null}
    <div><button disabled={busy || !canWork} onClick={() => { setBusy(true); void save().catch(setError).finally(() => setBusy(false)); }}>{t('save')}</button> <button className="bridge-primary" disabled={busy || paused || (attempt.policyVersion === 'v2' && attempt.currentSection === 'SPEAKING' && ![1, 2, 3].every(part => recordings.some(recording => recording.part === part)))} onClick={() => void submit()}>{attempt.currentSection === 'SPEAKING' ? t('submitMock') : t('submitSection')}</button></div>
  </article></main>;
}

export function IeltsMockDashboardCard() {
  const t = useT('ieltsMock', ieltsMockMessages);
  const { locale } = useLocalePreference(); const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof ieltsMockClient.catalog>> | null>(null); const [failed, setFailed] = useState<unknown>(null); useEffect(() => { void ieltsMockClient.catalog().then(setCatalog).catch(setFailed); }, []); const active = catalog?.mocks.find((mock) => mock.activeAttemptId); return <section className="dashboard-card" aria-labelledby="mock-card-heading"><span className="card-tag">{t('assessment')}</span><h2 id="mock-card-heading" className="section-title">{t('dashboardTitle')}</h2>{!catalog && !failed ? <p role="status">{t('checking')}</p> : null}{failed ? <p className="form-error">{localizedError(failed, locale)}</p> : null}{active?.activeAttemptId ? <><p>{t('savedDescription')}</p><Link className="primary-action-button" href={`/ielts/mock-tests/${active.activeAttemptId}`}>{t('resume')}</Link></> : catalog?.eligible ? <><p>{t('simulateDescription')}</p><Link className="primary-action-button" href="/ielts/mock-tests">{t('choose')}</Link></> : null}{catalog && !catalog.eligible ? <p>{catalog.lockedReason === 'BAND_PATHWAY_REQUIRED' ? t('bandRequired') : t('afterPublication')}</p> : null}</section>; }
