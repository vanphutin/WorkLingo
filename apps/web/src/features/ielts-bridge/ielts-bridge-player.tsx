'use client';

import type { IeltsBridgeSessionDto, LearnerIeltsBridgeTask } from '@worklingo/contracts';
import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsBridgeMessages } from '../../i18n/messages/ieltsBridge';
import { useEffect, useMemo, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import './ielts-bridge.css';

type Answer = number | number[] | string | undefined;

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function StageTask({ task, answer, onChange }: { readonly task: LearnerIeltsBridgeTask; readonly answer: Answer; readonly onChange: (answer: Answer) => void }) {
  const t = useT('ieltsBridge', ieltsBridgeMessages);
  const { locale } = useLocalePreference();
  if (task.kind === 'instruction') return <p className="bridge-note">{t('instructionHelp')}</p>;
  if (task.kind === 'single_choice') return <fieldset className="bridge-options" lang="en"><legend>{task.prompt}</legend>{task.options.map((option, index) => <label key={option}><input type="radio" name="bridge-answer" checked={answer === index} onChange={() => onChange(index)} />{option}</label>)}</fieldset>;
  if (task.kind === 'multi_choice') { const selected = Array.isArray(answer) ? answer : []; return <fieldset className="bridge-options" lang="en"><legend>{task.prompt}</legend>{task.options.map((option, index) => <label key={option}><input type="checkbox" checked={selected.includes(index)} onChange={() => onChange(selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index])} />{option}</label>)}</fieldset>; }
  const spoken = task.kind === 'spoken_response';
  return <label className="bridge-response"><span lang="en">{task.prompt}</span>{spoken ? <small>{t('spokenHelp', { preparation: formatNumber(locale, task.preparationSeconds), response: formatNumber(locale, task.responseSeconds) })}</small> : <small>{t('minimumWords', { count: formatNumber(locale, task.minWords) })}</small>}<textarea lang="en" value={typeof answer === 'string' ? answer : ''} onChange={(event) => onChange(event.target.value)} rows={7} /></label>;
}

export function IeltsBridgePlayer({ moduleId }: { readonly moduleId: string }) {
  const t = useT('ieltsBridge', ieltsBridgeMessages);
  const { locale } = useLocalePreference();
  const [session, setSession] = useState<IeltsBridgeSessionDto | null>(null);
  const [answer, setAnswer] = useState<Answer>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { void ieltsBridgeClient.start(moduleId).then(setSession).catch((cause) => setError(cause)); }, [moduleId]);
  useEffect(() => {
    if (!session?.progress.timedStageDeadlineAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.progress.timedStageDeadlineAt]);
  const stage = session?.module.stages[session.progress.currentStageIndex];
  const completed = Boolean(session?.progress.completedAt);
  const needsAnswer = stage?.task.kind !== 'instruction';
  const hasAnswer = useMemo(() => typeof answer === 'number' || (typeof answer === 'string' && answer.trim().length > 0) || (Array.isArray(answer) && answer.length > 0), [answer]);
  const timed = Boolean(stage?.timeLimitSeconds);
  const timerStarted = Boolean(session?.progress.timedStageStartedAt);

  const update = async (input: { startTimer?: boolean; completeStage?: boolean; answer?: Answer }) => {
    if (!session || !stage || saving) return;
    setSaving(true); setError(null);
    try {
      const result = await ieltsBridgeClient.updateProgress(moduleId, { expectedRevision: session.progress.revision, stageIndex: session.progress.currentStageIndex, ...input });
      setSession({ ...session, progress: result.progress }); setFeedback(result.feedbackMessage); setAnswer(undefined); setNow(Date.now());
    } catch (cause) { setError(cause); }
    finally { setSaving(false); }
  };

  if (error && !session) return <main className="bridge-shell bridge-state"><h1>{t('title')}</h1><p role="alert">{localizedError(error, locale)}</p><Link href="/ielts/bridge">{t('modules')}</Link></main>;
  if (!session || !stage) return <main className="bridge-shell bridge-state"><p role="status">{t('opening')}</p></main>;
  if (completed) return <main className="bridge-shell bridge-state"><p className="bridge-kicker">{t('moduleComplete')}</p><h1 lang="en">{session.module.title}</h1><p>{t('versionSaved')}</p><Link className="bridge-primary" href="/ielts/bridge">{t('anotherModule')}</Link></main>;
  const remaining = session.progress.timedStageDeadlineAt ? new Date(session.progress.timedStageDeadlineAt).getTime() - now : 0;
  return <main className="bridge-shell bridge-player">
    <header className="bridge-heading"><div><p className="bridge-kicker">{t('skillStageProgress', { skill: t(session.module.skill), stage: formatNumber(locale, session.progress.currentStageIndex + 1) })}</p><h1 lang="en">{session.module.title}</h1></div><Link href="/ielts/bridge">{t('exit')}</Link></header>
    <nav className="bridge-stage-nav" aria-label={t('stages')}>{session.module.stages.map((item, index) => <span key={item.slug} aria-current={index === session.progress.currentStageIndex ? 'step' : undefined} className={index < session.progress.currentStageIndex ? 'done' : ''}>{formatNumber(locale, index + 1)}<span className="sr-only" lang="en"> {item.title}</span></span>)}</nav>
    <article className="bridge-stage-card"><p className="bridge-kicker">{t(stage.type === 'review' ? 'reviewStage' : stage.type)}</p><h2 lang="en">{stage.title}</h2><p className="bridge-instruction" lang="en">{stage.instruction}</p>
      {stage.strategySteps.length ? <ol className="bridge-strategy" lang="en">{stage.strategySteps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
      {timed && !timerStarted ? <button className="bridge-primary" type="button" disabled={saving} onClick={() => void update({ startTimer: true })}>{t('startTimer', { count: Math.ceil((stage.timeLimitSeconds ?? 60) / 60) })}</button> : null}
      {timed && timerStarted ? <p className="bridge-timer" role="timer">{t('remainingTime', { time: formatTime(remaining) })}</p> : null}
      <StageTask task={stage.task} answer={answer} onChange={setAnswer} />
      {feedback ? <p className="bridge-feedback" role="status" lang="en">{feedback}</p> : null}
      {error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}
      <div className="bridge-actions"><button className="bridge-primary" type="button" disabled={saving || (needsAnswer && !hasAnswer) || (timed && !timerStarted)} onClick={() => void update({ answer, completeStage: true })}>{needsAnswer ? t('submit') : t('complete')}</button></div>
    </article>
  </main>;
}
