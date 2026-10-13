'use client';

import type { IeltsBridgeSessionDto, LearnerIeltsBridgeTask } from '@worklingo/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ieltsBridgeClient } from '../../lib/api/ielts-bridge-client';
import './ielts-bridge.css';

type Answer = number | number[] | string | undefined;

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function StageTask({ task, answer, onChange }: { readonly task: LearnerIeltsBridgeTask; readonly answer: Answer; readonly onChange: (answer: Answer) => void }) {
  if (task.kind === 'instruction') return <p className="bridge-note">Read the guidance, then mark this stage complete when you are ready.</p>;
  if (task.kind === 'single_choice') return <fieldset className="bridge-options"><legend>{task.prompt}</legend>{task.options.map((option, index) => <label key={option}><input type="radio" name="bridge-answer" checked={answer === index} onChange={() => onChange(index)} />{option}</label>)}</fieldset>;
  if (task.kind === 'multi_choice') { const selected = Array.isArray(answer) ? answer : []; return <fieldset className="bridge-options"><legend>{task.prompt}</legend>{task.options.map((option, index) => <label key={option}><input type="checkbox" checked={selected.includes(index)} onChange={() => onChange(selected.includes(index) ? selected.filter((item) => item !== index) : [...selected, index])} />{option}</label>)}</fieldset>; }
  const spoken = task.kind === 'spoken_response';
  return <label className="bridge-response"><span>{task.prompt}</span>{spoken ? <small>Preparation: {task.preparationSeconds}s. Response: {task.responseSeconds}s. Enter your response transcript.</small> : <small>Minimum {task.minWords} words.</small>}<textarea value={typeof answer === 'string' ? answer : ''} onChange={(event) => onChange(event.target.value)} rows={7} /></label>;
}

export function IeltsBridgePlayer({ moduleId }: { readonly moduleId: string }) {
  const [session, setSession] = useState<IeltsBridgeSessionDto | null>(null);
  const [answer, setAnswer] = useState<Answer>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { void ieltsBridgeClient.start(moduleId).then(setSession).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to open this module.')); }, [moduleId]);
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your progress.'); }
    finally { setSaving(false); }
  };

  if (error && !session) return <main className="bridge-shell bridge-state"><h1>IELTS Bridge</h1><p role="alert">{error}</p><Link href="/ielts/bridge">Back to modules</Link></main>;
  if (!session || !stage) return <main className="bridge-shell bridge-state"><p role="status">Opening your saved module...</p></main>;
  if (completed) return <main className="bridge-shell bridge-state"><p className="bridge-kicker">Module complete</p><h1>{session.module.title}</h1><p>Your progress is saved to this module version.</p><Link className="bridge-primary" href="/ielts/bridge">Choose another module</Link></main>;
  const remaining = session.progress.timedStageDeadlineAt ? new Date(session.progress.timedStageDeadlineAt).getTime() - now : 0;
  return <main className="bridge-shell bridge-player">
    <header className="bridge-heading"><div><p className="bridge-kicker">{session.module.skill} · Stage {session.progress.currentStageIndex + 1} of 10</p><h1>{session.module.title}</h1></div><Link href="/ielts/bridge">Save and exit</Link></header>
    <nav className="bridge-stage-nav" aria-label="Module stages">{session.module.stages.map((item, index) => <span key={item.slug} aria-current={index === session.progress.currentStageIndex ? 'step' : undefined} className={index < session.progress.currentStageIndex ? 'done' : ''}>{index + 1}<span className="sr-only"> {item.title}</span></span>)}</nav>
    <article className="bridge-stage-card"><p className="bridge-kicker">{stage.type.replaceAll('_', ' ')}</p><h2>{stage.title}</h2><p className="bridge-instruction">{stage.instruction}</p>
      {stage.strategySteps.length ? <ol className="bridge-strategy">{stage.strategySteps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
      {timed && !timerStarted ? <button className="bridge-primary" type="button" disabled={saving} onClick={() => void update({ startTimer: true })}>Start {Math.ceil((stage.timeLimitSeconds ?? 60) / 60)} minute timer</button> : null}
      {timed && timerStarted ? <p className="bridge-timer" role="timer">Time remaining: {formatTime(remaining)}</p> : null}
      <StageTask task={stage.task} answer={answer} onChange={setAnswer} />
      {feedback ? <p className="bridge-feedback" role="status">{feedback}</p> : null}
      {error ? <p className="bridge-error" role="alert">{error}</p> : null}
      <div className="bridge-actions"><button className="bridge-primary" type="button" disabled={saving || (needsAnswer && !hasAnswer) || (timed && !timerStarted)} onClick={() => void update({ answer, completeStage: true })}>{needsAnswer ? 'Submit stage' : 'Complete stage'}</button></div>
    </article>
  </main>;
}
