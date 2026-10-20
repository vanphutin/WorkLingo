'use client';

import type { IeltsIntegratedDifficulty, IeltsIntegratedSessionDto, LearnerIeltsBridgeTask } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsIntegratedMessages } from '../../i18n/messages/ieltsIntegrated';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ieltsIntegratedClient } from '../../lib/api/ielts-integrated-client';
import '../ielts-bridge/ielts-bridge.css';
import '../ielts-mock/exam-experience.css';

import { GlassSurface } from '../../components/glass-surface';

type Answer = number | number[] | string | undefined;
const formatTime = (milliseconds: number) => { const seconds = Math.max(0, Math.ceil(milliseconds / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };

function Task({ task, answer, onChange }: { readonly task: LearnerIeltsBridgeTask; readonly answer: Answer; readonly onChange: (value: Answer) => void }) {
  const t = useT('ieltsIntegrated', ieltsIntegratedMessages);
  const { locale } = useLocalePreference();
  if (task.kind === 'instruction') return <p>{t('instructionHelp')}</p>;
  if (task.kind === 'single_choice') return <fieldset className="bridge-options"><legend lang="en">{task.prompt}</legend>{task.options.map((option, index) => <label key={option} lang="en"><input type="radio" name="integrated-answer" checked={answer === index} onChange={() => onChange(index)} />{option}</label>)}</fieldset>;
  if (task.kind === 'multi_choice') { const selected = Array.isArray(answer) ? answer : []; return <fieldset className="bridge-options"><legend lang="en">{task.prompt}</legend>{task.options.map((option, index) => <label key={option} lang="en"><input type="checkbox" checked={selected.includes(index)} onChange={() => onChange(selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index])} />{option}</label>)}</fieldset>; }
  return <label className="bridge-response"><span lang="en">{task.prompt}</span><small>{task.kind === 'spoken_response' ? t('spokenHelp', { preparation: formatNumber(locale, task.preparationSeconds), response: formatNumber(locale, task.responseSeconds) }) : t('minimumWords', { count: formatNumber(locale, task.minWords) })}</small><textarea lang="en" rows={8} value={typeof answer === 'string' ? answer : ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function IntegratedPracticeLauncher() {
  const t = useT('ieltsIntegrated', ieltsIntegratedMessages);
  const { locale } = useLocalePreference();
  const router = useRouter(); const [availability, setAvailability] = useState<Awaited<ReturnType<typeof ieltsIntegratedClient.availability>> | null>(null);
  const [duration, setDuration] = useState<60 | 90 | 120 | 150>(60); const [difficulty, setDifficulty] = useState<IeltsIntegratedDifficulty>('foundation'); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [clientSessionId] = useState(() => crypto.randomUUID());
  useEffect(() => { void ieltsIntegratedClient.availability().then((value) => { setAvailability(value); if (value.durations[0]) setDuration(value.durations[0]); }).catch((cause) => setError(cause)); }, []);
  if (!availability && !error) return <main className="bridge-shell exam-surface integrated-page bridge-state"><p role="status">{t('loading')}</p></main>;
  return <main className="bridge-shell exam-surface integrated-page"><header className="bridge-heading"><div><p className="bridge-kicker">{t('training')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div></header>
    {error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}
    {availability?.activeSessionId ? <section className="bridge-stage-card"><h2>{t('continueSaved')}</h2><Link className="bridge-primary" href={`/ielts/practice/${availability.activeSessionId}`}>{t('resume')}</Link></section> : null}
    {availability && !availability.eligible ? <section className="bridge-stage-card"><h2>{t('locked')}</h2><p>{availability.lockedReason === 'BRIDGE_REQUIRED' ? t('bridgeRequired') : t('notPublished')}</p></section> : null}
    {availability?.eligible ? <section className="bridge-stage-card"><h2>{t('build')}</h2><label>{t('duration')}<select value={duration} onChange={(event) => setDuration(Number(event.target.value) as typeof duration)}>{availability.durations.map((value) => <option key={value} value={value}>{t('minutes', { count: formatNumber(locale, value) })}</option>)}</select></label><label>{t('difficulty')}<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as IeltsIntegratedDifficulty)}>{availability.difficulties.map((value) => <option key={value} value={value}>{t(value)}</option>)}</select></label><button className="bridge-primary" type="button" disabled={busy} onClick={() => { setBusy(true); void ieltsIntegratedClient.start({ clientSessionId, durationMinutes: duration, difficulty }).then((session) => router.push(`/ielts/practice/${session.id}`)).catch((cause) => { setError(cause); setBusy(false); }); }}>{busy ? t('building') : t('start')}</button></section> : null}
  </main>;
}

export function IntegratedPracticePlayer({ sessionId }: { readonly sessionId: string }) {
  const t = useT('ieltsIntegrated', ieltsIntegratedMessages);
  const { locale } = useLocalePreference();
  const [session, setSession] = useState<IeltsIntegratedSessionDto | null>(null); const [answer, setAnswer] = useState<Answer>(); const [error, setError] = useState<unknown>(null); const [feedback, setFeedback] = useState<string | null>(null); const [nextStep, setNextStep] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [clock, setClock] = useState(Date.now());
  useEffect(() => { void ieltsIntegratedClient.get(sessionId).then(setSession).catch((cause) => setError(cause)); }, [sessionId]);
  const block = session?.blocks[session.currentBlockIndex]; const hasAnswer = useMemo(() => typeof answer === 'number' || (typeof answer === 'string' && answer.trim().length > 0) || (Array.isArray(answer) && answer.length > 0), [answer]);
  useEffect(() => { if (!block?.startedAt) return; const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, [block?.startedAt]);
  if (error && !session) return <main className="bridge-shell exam-surface integrated-page bridge-state"><h1>{t('title')}</h1><p role="alert">{localizedError(error, locale)}</p></main>;
  if (!session || !block) return <main className="bridge-shell exam-surface integrated-page bridge-state"><p role="status">{t('restoring')}</p></main>;
  if (session.completedAt) return <main className="bridge-shell exam-surface integrated-page bridge-state"><p className="bridge-kicker">{t('sessionComplete')}</p><h1>{t('evidenceSaved')}</h1><p>{t('noBandEstimate')}</p>{feedback ? <p className="bridge-feedback" lang="en">{feedback}</p> : null}<ul>{session.blocks.map((item) => <li key={item.skill}><strong>{t(item.skill)}</strong>: {item.correct === true ? t('correct') : item.correct === false ? t('needsReview') : t('responseSaved')}{item.timedOut ? t('overtimeSuffix') : ''}</li>)}</ul>{nextStep ? <p><strong>{t('nextStep')}</strong> {nextStep === 'Review your four-skill evidence and continue targeted practice.' ? t('nextStepDescription') : <span lang="en">{nextStep}</span>}</p> : null}<Link className="bridge-primary" href="/ielts/practice">{t('anotherSession')}</Link></main>;
  const remaining = block.startedAt ? new Date(block.startedAt).getTime() + block.targetMinutes * 60_000 - clock : block.targetMinutes * 60_000;
  return <main className="bridge-shell exam-surface integrated-page bridge-player"><header className="bridge-heading"><div><p className="bridge-kicker">{t('sessionMeta', { count: formatNumber(locale, session.plan.durationMinutes), difficulty: t(session.plan.difficulty) })}</p><h1>{t('title')}</h1></div><Link href="/dashboard">{t('exit')}</Link></header><GlassSurface className="exam-progress-surface" variant="solid"><nav className="bridge-stage-nav" aria-label={t('blocks')}>{session.blocks.map((item, index) => <span key={item.skill} aria-current={index === session.currentBlockIndex ? 'step' : undefined} className={index < session.currentBlockIndex ? 'done' : ''}>{formatNumber(locale, item.order)}<span className="sr-only"> {t(item.skill)}</span></span>)}</nav></GlassSurface><article className="bridge-stage-card"><p className="bridge-kicker">{t('blockMeta', { skill: t(block.skill), count: formatNumber(locale, block.targetMinutes), mode: t(block.mode) })}</p><h2 lang="en">{block.title}</h2><p className="bridge-timer" role="timer">{remaining > 0 ? t('remainingTime', { time: formatTime(remaining) }) : t('overtime', { time: formatTime(Math.abs(remaining)) })}</p><p lang="en">{block.instruction}</p><Task task={block.task} answer={answer} onChange={setAnswer} />{feedback ? <p className="bridge-feedback" role="status" lang="en">{feedback}</p> : null}{error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}<button className="bridge-primary" type="button" disabled={busy || (block.task.kind !== 'instruction' && !hasAnswer)} onClick={() => { setBusy(true); setError(null); void ieltsIntegratedClient.update(sessionId, { expectedRevision: session.revision, blockIndex: session.currentBlockIndex, answer }).then((result) => { const movedToNextBlock = result.session.currentBlockIndex !== session.currentBlockIndex; setSession(result.session); setFeedback(result.session.completedAt || !movedToNextBlock ? result.feedbackMessage : null); setNextStep(result.nextStep); setAnswer(undefined); setClock(Date.now()); }).catch((cause) => setError(cause)).finally(() => setBusy(false)); }}>{busy ? t('saving') : block.order === 4 ? t('completeSession') : t('completeBlock')}</button></article></main>;
}

export function IntegratedPracticeDashboardCard() {
  const t = useT('ieltsIntegrated', ieltsIntegratedMessages);
  const { locale } = useLocalePreference();
  const [availability, setAvailability] = useState<Awaited<ReturnType<typeof ieltsIntegratedClient.availability>> | null>(null); const [failed, setFailed] = useState<unknown>(null);
  useEffect(() => { void ieltsIntegratedClient.availability().then(setAvailability).catch(setFailed); }, []);
  return <section className="dashboard-card" aria-labelledby="integrated-card-heading"><span className="card-tag">{t('pathway')}</span><h2 id="integrated-card-heading" className="section-title">{t('title')}</h2>{!availability && !failed ? <p role="status">{t('checking')}</p> : null}{failed ? <p className="form-error">{localizedError(failed, locale)}</p> : null}{availability?.activeSessionId ? <><p>{t('savedDescription')}</p><Link className="primary-action-button" href={`/ielts/practice/${availability.activeSessionId}`}>{t('resumePractice')}</Link></> : availability?.eligible ? <><p>{t('trainingDescription')}</p><Link className="primary-action-button" href="/ielts/practice">{t('buildPractice')}</Link></> : null}{availability && !availability.eligible && !availability.activeSessionId ? <p>{t(availability.lockedReason === 'PROFILES_NOT_PUBLISHED' ? 'notPublished' : 'unlock')}</p> : null}</section>;
}
