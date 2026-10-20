'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { IeltsIntroductionDto } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsIntroductionMessages } from '../../i18n/messages/ieltsIntroduction';
import { ieltsIntroductionClient } from '../../lib/api/ielts-introduction-client';
import { BrowserSpeechControls } from '../audio/browser-speech-controls';
import './introduction-player.css';

export function IntroductionPlayer({ initialVersionId }: { readonly initialVersionId?: string | undefined }) {
  const t = useT('ieltsIntroduction', ieltsIntroductionMessages);
  const { locale } = useLocalePreference();
  const [data, setData] = useState<IeltsIntroductionDto | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback(async (versionId?: string) => {
    setBusy(true); setError(null);
    try { const next = await ieltsIntroductionClient.get(versionId); setData(next); setIndex(next.visit?.lastSlideIndex ?? 0);
      if (!next.visit) { const visit=await ieltsIntroductionClient.visit({orientationVersionId:next.presentation.id,slideIndex:0,expectedRevision:0}); setData({...next,visit}); }
    }
    catch (cause) { setError(cause); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(initialVersionId); }, [load, initialVersionId]);
  const navigate = async (target: number) => {
    if (!data?.visit || busy) return;
    setBusy(true); setError(null);
    try {
      const visit = await ieltsIntroductionClient.visit({ orientationVersionId: data.presentation.id, slideIndex: target, expectedRevision: data.visit?.revision ?? 0 });
      setData({ ...data, visit }); setIndex(target);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (cause) { setError(cause); }
    finally { setBusy(false); }
  };
  const slide = data?.presentation.slides[index];
  return <main className="ielts-intro">
    <header><Link href="/ielts">← {t('back')}</Link><h1>{t('title')}</h1><p>{t('description')}</p><div className="ielts-intro__links"><Link href="/ielts/learn">{t('skip')}</Link><Link href="/ielts/mock-tests">{t('mock')}</Link></div></header>
    {error ? <div role="alert"><p>{localizedError(error, locale)}</p><button type="button" disabled={busy} onClick={() => void load(data?.presentation.id)}>{t('retry')}</button></div> : null}
    {!data ? <p aria-busy={busy}>{busy ? t('loading') : ''}</p> : <>
      <div className="ielts-intro__meta"><span>{t('version', { version: data.presentation.version })}</span>{data.visit?.viewedAllAt ? <span>{t('viewed')}</span> : null}{data.currentPublishedVersionId && data.currentPublishedVersionId !== data.presentation.id ? <button type="button" disabled={busy} onClick={() => void load(data.currentPublishedVersionId!)}>{t('latest')}</button> : null}</div>
      <div className="ielts-intro__layout">
        <nav aria-label={t('contents')}><ol>{data.presentation.slides.map((item, position) => <li key={item.id}><button type="button" aria-current={position === index ? 'step' : undefined} disabled={busy || !data.visit} onClick={() => void navigate(position)}>{position + 1}. {item.title}</button></li>)}</ol></nav>
        {slide ? <article aria-busy={busy}>
          <p className="ielts-intro__position" aria-live="polite">{t('position', { index: index + 1, total: data.presentation.slides.length })}</p>
          <h2 ref={heading} tabIndex={-1} lang="en">{slide.title}</h2>
          {slide.imageUrl ? <img src={slide.imageUrl} alt="" loading="lazy" width={1200} height={675} /> : null}
          <p className="ielts-intro__body" lang="en">{slide.body}</p>
          <div key={slide.id}>{slide.audioUrl ? <audio controls preload="none" src={slide.audioUrl} /> : <BrowserSpeechControls sessionId={data.presentation.id} itemId={slide.id} lang="en-GB" text={slide.transcript} />}</div>
          <details><summary>{t('captions')}</summary><p lang="en">{slide.transcript}</p></details>
          {slide.question ? <fieldset key={`reflection-${slide.id}`}><legend>{t('optional')} · <span lang="en">{slide.question.prompt}</span></legend>{slide.question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={slide.question!.slug} value={optionIndex} /> <span lang="en">{option}</span></label>)}</fieldset> : null}
          <footer><button type="button" disabled={busy || !data.visit || index === 0} onClick={() => void navigate(index - 1)}>{t('previous')}</button><button type="button" disabled={busy || !data.visit || index === data.presentation.slides.length - 1} onClick={() => void navigate(index + 1)}>{t('next')}</button></footer>
        </article> : null}
      </div>
    </>}
  </main>;
}
