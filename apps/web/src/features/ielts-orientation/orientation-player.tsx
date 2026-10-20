'use client';

import Link from 'next/link';
import { useT, useLocalePreference } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import { ieltsOrientationMessages } from '../../i18n/messages/ieltsOrientation';
import { useEffect, useRef, useState } from 'react';
import type { OrientationLearnerStatusDto } from '@worklingo/contracts';
import { BrowserSpeechControls } from '../audio/browser-speech-controls';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import './orientation-player.css';
import { GlassSurface } from '../../components/glass-surface';

function Narration({ audioUrl, transcript }: { audioUrl: string | null; transcript: string }) {
  const t = useT('ieltsOrientation', ieltsOrientationMessages);
  const { locale } = useLocalePreference();
  const audio = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  if (!audioUrl) return <div className="orientation-narration"><p>{t('browserVoice')}</p><BrowserSpeechControls lang="en-GB" text={transcript} /></div>;
  return <div className="orientation-narration">
    <audio ref={audio} controls preload="metadata" src={audioUrl}>{t('audioUnsupported')}</audio>
    <div className="orientation-narration__settings">
      <label>{t('speed')}<select value={rate} onChange={(event) => { const next = Number(event.target.value); setRate(next); if (audio.current) audio.current.playbackRate = next; }}>{[0.75, 1, 1.25, 1.5].map((speed) => <option key={speed} value={speed}>{formatNumber(locale, speed)}×</option>)}</select></label>
      <label>{t('volume')}<input type="range" min="0" max="1" step="0.1" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audio.current) audio.current.volume = next; }} /></label>
      <button type="button" onClick={() => { if (!audio.current) return; audio.current.currentTime = 0; void audio.current.play(); }}>{t('replay')}</button>
    </div>
  </div>;
}

export function OrientationPlayer() {
  const t = useT('ieltsOrientation', ieltsOrientationMessages);
  const { locale } = useLocalePreference();
  const [status, setStatus] = useState<OrientationLearnerStatusDto | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => { void ieltsOrientationClient.getStatus().then(setStatus).catch((cause) => setError(cause)); }, []);

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
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };

  if (!status && !error) return <main className="orientation-player orientation-player--loading" aria-busy="true">{t('loading')}</main>;
  if (error && !status) return <main className="orientation-player"><p role="alert">{localizedError(error, locale)}</p><Link href="/dashboard">{t('returnDashboard')}</Link></main>;
  if (status?.state === 'locked') return <main className="orientation-player orientation-player--locked"><p className="orientation-player__kicker">{t('pathway')}</p><h1>{t('locked')}</h1><p>{t('lockedDescription')}</p><Link href="/dashboard">{t('returnDashboard')}</Link></main>;
  if (status?.state === 'available') return <main className="orientation-player orientation-player--intro"><p className="orientation-player__kicker">{t('beforeStudy')}</p><h1>{t('title')}</h1><p>{t('guidedIntro')}</p><button type="button" disabled={busy} onClick={() => { setBusy(true); void ieltsOrientationClient.start().then(setStatus).catch((cause) => setError(cause)).finally(() => setBusy(false)); }}>{t('begin')}</button>{error ? <p role="alert">{localizedError(error, locale)}</p> : null}</main>;
  if (!status?.presentation || !status.progress) return <main className="orientation-player"><p role="alert">{t('contentUnavailable')}</p></main>;
  if (status.state === 'completed') return <main className="orientation-player orientation-player--complete"><p className="orientation-player__kicker">{t('milestone')}</p><h1>{t('completeTitle')}</h1><p>{t('readyDescription')}</p><Link className="orientation-player__primary" href="/dashboard">{t('returnDashboard')}</Link></main>;

  const index = status.progress.currentSlideIndex;
  const slide = status.presentation.slides[index];
  if (!slide) return <main className="orientation-player"><p role="alert">{t('slideUnavailable')}</p></main>;
  const last = index === status.presentation.slides.length - 1;
  const continueDisabled = busy || (slide.question !== null && selectedAnswer === null);

  return <main className="orientation-player">
    <GlassSurface className="orientation-player__control-surface"><header className="orientation-player__header"><Link href="/dashboard">{t('exit')}</Link><p>{t('version', { version: formatNumber(locale, status.presentation.version) })}</p></header></GlassSurface>
    <div className="orientation-player__progress" aria-label={t('slideProgress', { slide: formatNumber(locale, index + 1), total: formatNumber(locale, status.presentation.slides.length) })}><span style={{ width: `${((index + 1) / status.presentation.slides.length) * 100}%` }} /></div>
    <article className="orientation-player__slide">
      <div className="orientation-player__meta"><span>{t('slideCounter', { slide: formatNumber(locale, index + 1), total: formatNumber(locale, status.presentation.slides.length) })}</span><span lang="en">{status.presentation.title}</span></div>
      <h1 lang="en">{slide.title}</h1>
      {slide.imageUrl ? <img src={slide.imageUrl} alt="" width="1200" height="675" loading="lazy" /> : null}
      <p className="orientation-player__body" lang="en">{slide.body}</p>
      <Narration key={slide.id} audioUrl={slide.audioUrl} transcript={slide.transcript} />
      <details open className="orientation-transcript"><summary>{t('captions')}</summary><p lang="en">{slide.transcript}</p></details>
      {slide.question ? <fieldset className="orientation-question" lang="en"><legend>{slide.question.prompt}</legend>{slide.question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={slide.question!.slug} checked={selectedAnswer === optionIndex} onChange={() => { setSelectedAnswer(optionIndex); setFeedback(null); }} />{option}</label>)}</fieldset> : null}
      {feedback ? <p className={`orientation-feedback ${feedback.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{feedback.correct ? t('correct') : t('retry')}</strong> <span lang="en">{feedback.explanation}</span></p> : null}
      {error ? <p className="orientation-feedback incorrect" role="alert">{localizedError(error, locale)}</p> : null}
      <footer className="orientation-player__actions">
        <button type="button" onClick={() => void persist(index - 1)} disabled={busy || index === 0}>{t('previous')}</button>
        {last ? <button type="button" className="orientation-player__primary" onClick={() => void persist(index, true)} disabled={busy}>{t('complete')}</button> : <button type="button" className="orientation-player__primary" onClick={() => void persist(index + 1)} disabled={continueDisabled}>{t('continue')}</button>}
      </footer>
    </article>
  </main>;
}
