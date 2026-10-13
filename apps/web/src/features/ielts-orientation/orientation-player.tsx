'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { OrientationLearnerStatusDto } from '@worklingo/contracts';
import { BrowserSpeechControls } from '../audio/browser-speech-controls';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import './orientation-player.css';

function Narration({ audioUrl, transcript }: { audioUrl: string | null; transcript: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  if (!audioUrl) return <div className="orientation-narration"><p>Browser voice fallback</p><BrowserSpeechControls lang="en-GB" text={transcript} /></div>;
  return <div className="orientation-narration">
    <audio ref={audio} controls preload="metadata" src={audioUrl}>Your browser does not support audio playback.</audio>
    <div className="orientation-narration__settings">
      <label>Speed<select value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); if (audio.current) audio.current.playbackRate = next; }}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
      <label>Volume<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audio.current) audio.current.volume = next; }} /></label>
      <button type="button" onClick={() => { if (!audio.current) return; audio.current.currentTime = 0; void audio.current.play(); }}>Replay</button>
    </div>
  </div>;
}

export function OrientationPlayer() {
  const [status, setStatus] = useState<OrientationLearnerStatusDto | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void ieltsOrientationClient.getStatus().then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load orientation.')); }, []);

  const persist = async (targetSlideIndex: number, complete = false) => {
    if (!status?.presentation || !status.progress) return;
    const slide = status.presentation.slides[status.progress.currentSlideIndex];
    setBusy(true); setError(null);
    try {
      const result = await ieltsOrientationClient.updateProgress({
        orientationVersionId: status.progress.orientationVersionId,
        expectedRevision: status.progress.revision,
        targetSlideIndex,
        complete,
        ...(slide?.question && selectedAnswer !== null ? { answer: { questionSlug: slide.question.slug, selectedIndex: selectedAnswer } } : {}),
      });
      setFeedback(result.answerFeedback ? { correct: result.answerFeedback.correct, explanation: result.answerFeedback.explanation } : null);
      setStatus({ ...status, state: result.progress.completedAt ? 'completed' : 'in_progress', progress: result.progress });
      if (!result.answerFeedback || result.answerFeedback.correct) setSelectedAnswer(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save progress.'); }
    finally { setBusy(false); }
  };

  if (!status && !error) return <main className="orientation-player orientation-player--loading" aria-busy="true">Loading your IELTS Orientation…</main>;
  if (error && !status) return <main className="orientation-player"><p role="alert">{error}</p><Link href="/dashboard">Return to dashboard</Link></main>;
  if (status?.state === 'locked') return <main className="orientation-player orientation-player--locked"><p className="orientation-player__kicker">IELTS pathway</p><h1>Orientation is locked</h1><p>Complete your Foundation checkpoint and four-skill evidence first.</p><Link href="/dashboard">Return to dashboard</Link></main>;
  if (status?.state === 'available') return <main className="orientation-player orientation-player--intro"><p className="orientation-player__kicker">Before IELTS study</p><h1>IELTS Orientation</h1><p>A short, guided introduction to the test format, all four skills and how WorkLingo will support your progress.</p><button type="button" disabled={busy} onClick={() => { setBusy(true); void ieltsOrientationClient.start().then(setStatus).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to start.')).finally(() => setBusy(false)); }}>Begin orientation</button>{error ? <p role="alert">{error}</p> : null}</main>;
  if (!status?.presentation || !status.progress) return <main className="orientation-player"><p role="alert">Orientation content is unavailable.</p></main>;
  if (status.state === 'completed') return <main className="orientation-player orientation-player--complete"><p className="orientation-player__kicker">Pathway milestone</p><h1>IELTS Orientation complete</h1><p>You understand the IELTS structure and are ready for the next learning phase.</p><Link className="orientation-player__primary" href="/dashboard">Return to dashboard</Link></main>;

  const index = status.progress.currentSlideIndex;
  const slide = status.presentation.slides[index];
  if (!slide) return <main className="orientation-player"><p role="alert">Saved slide is unavailable in this version.</p></main>;
  const last = index === status.presentation.slides.length - 1;
  const continueDisabled = busy || (slide.question !== null && selectedAnswer === null);

  return <main className="orientation-player">
    <header className="orientation-player__header"><Link href="/dashboard">Exit to dashboard</Link><p>Version {status.presentation.version}</p></header>
    <div className="orientation-player__progress" aria-label={`Slide ${index + 1} of ${status.presentation.slides.length}`}><span style={{ width: `${((index + 1) / status.presentation.slides.length) * 100}%` }} /></div>
    <article className="orientation-player__slide">
      <div className="orientation-player__meta"><span>Slide {index + 1} / {status.presentation.slides.length}</span><span>{status.presentation.title}</span></div>
      <h1>{slide.title}</h1>
      {slide.imageUrl ? <img src={slide.imageUrl} alt="" width="1200" height="675" loading="lazy" /> : null}
      <p className="orientation-player__body">{slide.body}</p>
      <Narration key={slide.id} audioUrl={slide.audioUrl} transcript={slide.transcript} />
      <details open className="orientation-transcript"><summary>Transcript and captions</summary><p>{slide.transcript}</p></details>
      {slide.question ? <fieldset className="orientation-question"><legend>{slide.question.prompt}</legend>{slide.question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={slide.question!.slug} checked={selectedAnswer === optionIndex} onChange={() => { setSelectedAnswer(optionIndex); setFeedback(null); }} />{option}</label>)}</fieldset> : null}
      {feedback ? <p className={`orientation-feedback ${feedback.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{feedback.correct ? 'Correct.' : 'Try again.'}</strong> {feedback.explanation}</p> : null}
      {error ? <p className="orientation-feedback incorrect" role="alert">{error}</p> : null}
      <footer className="orientation-player__actions">
        <button type="button" onClick={() => void persist(index - 1)} disabled={busy || index === 0}>Previous</button>
        {last ? <button type="button" className="orientation-player__primary" onClick={() => void persist(index, true)} disabled={busy}>Complete orientation</button> : <button type="button" className="orientation-player__primary" onClick={() => void persist(index + 1)} disabled={continueDisabled}>Continue</button>}
      </footer>
    </article>
  </main>;
}
