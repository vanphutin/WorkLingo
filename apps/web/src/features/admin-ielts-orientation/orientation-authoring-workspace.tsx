'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsOrientationMessages } from '../../i18n/messages/adminIeltsOrientation';
import { localizedError } from '../../i18n/errors';
import { formatNumber, formatDate } from '../../i18n/translator';
import type { MessageValues } from '../../i18n/translator';


import { useCallback, useEffect, useState } from 'react';
import type { OrientationContent, OrientationSlide } from '@worklingo/contracts';

import { adminIeltsOrientationClient } from '../../lib/api/admin-ielts-orientation-client';
import { ApiError } from '../../lib/api/api-client';
import './orientation-authoring.css';
import '../admin-content/authoring-experience.css';

type Notice = { key: keyof typeof adminIeltsOrientationMessages['en']; values?: MessageValues };

const emptyQuestion = { slug: 'knowledge-check', prompt: 'Choose the best answer.', options: ['Option one', 'Option two'], answerIndex: 0, explanation: 'Explain why this answer is correct.' };

export function OrientationAuthoringWorkspace() {
  const t = useT('adminIeltsOrientation', adminIeltsOrientationMessages);
  const { locale } = useLocalePreference();
  const statusLabel = (value: string) => ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED'].includes(value) ? t(value as 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED') : value;
  const [draft, setDraft] = useState<OrientationContent | null>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('DRAFT');
  const [versions, setVersions] = useState<Array<{ id: string; version: number; status: string; publishedAt: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [issues, setIssues] = useState<Array<{ code?: string; path: string; message: string }>>([]);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const validationMessage = (issue: { code?: string; message: string }) => {
    if (locale === 'en') return issue.message;
    if (issue.code === 'TRANSCRIPT_REQUIRED' || issue.message === 'Transcript is required.') return t('transcriptRequired');
    if (issue.code === 'MEDIA_NOT_OWNED') return t('mediaOwnership');
    if (issue.message === 'Slide IDs must be unique') return t('uniqueSlideIds');
    if (issue.message === 'Slide slugs must be unique') return t('uniqueSlideSlugs');
    if (issue.message === 'answerIndex must reference an existing option') return t('answerIndex');
    return t('invalidField');
  };

  const load = useCallback(async () => {
    const data = await adminIeltsOrientationClient.get();
    setDraft(data.draft); setRevision(data.draftRevision); setStatus(data.status); setVersions(data.versions);
    setSelectedIndex((current) => Math.min(current, data.draft.slides.length - 1));
    setValidatedRevision(data.status === 'VALIDATED' ? data.draftRevision : null);
  }, []);

  useEffect(() => { void load().catch((cause) => setError(cause)); }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load(); setError('revisionConflict');
      } else setError(cause);
    } finally { setBusy(false); }
  };

  if (!draft) return <section className="orientation-loading" aria-busy={!error}>{error ? <p role="alert">{localizedError(error, locale)}</p> : t('loading')}</section>;
  const selected = draft.slides[selectedIndex];
  if (!selected) return null;

  const updateSelected = (patch: Partial<OrientationSlide>) => {
    setDraft((current) => current ? { ...current, slides: current.slides.map((slide, index) => index === selectedIndex ? { ...slide, ...patch } : slide) } : current);
    setValidatedRevision(null);
  };
  const move = (direction: -1 | 1) => {
    const target = selectedIndex + direction;
    if (target < 0 || target >= draft.slides.length) return;
    const slides = [...draft.slides];
    [slides[selectedIndex], slides[target]] = [slides[target]!, slides[selectedIndex]!];
    setDraft({ ...draft, slides }); setSelectedIndex(target); setValidatedRevision(null);
  };
  const addSlide = () => {
    const next = draft.slides.length + 1;
    setDraft({ ...draft, slides: [...draft.slides, { id: crypto.randomUUID(), slug: `slide-${next}`, title: `Slide ${next}`, body: 'Add learner-facing content.', transcript: 'Add an accessible narration transcript.', imageAssetId: null, audioAssetId: null, question: null }] });
    setSelectedIndex(draft.slides.length); setValidatedRevision(null);
  };
  const removeSlide = () => {
    if (draft.slides.length <= 3) return;
    if (!window.confirm(t('deleteConfirm', { title: selected.title }))) return;
    setDraft({ ...draft, slides: draft.slides.filter((_, index) => index !== selectedIndex) });
    setSelectedIndex(Math.max(0, selectedIndex - 1)); setValidatedRevision(null);
  };
  const upload = (kind: 'AUDIO' | 'IMAGE', file?: File) => {
    if (!file) return;
    void run(async () => {
      const asset = await adminIeltsOrientationClient.uploadMedia(kind, file);
      updateSelected(kind === 'AUDIO' ? { audioAssetId: asset.id } : { imageAssetId: asset.id });
      setMediaUrls((current) => ({ ...current, [asset.id]: asset.contentUrl }));
      setMessage({ key: kind === 'AUDIO' ? 'audioUploaded' : 'imageUploaded' });
    });
  };

  return <section className="orientation-admin authoring-experience">
    <header className="orientation-admin__header">
      <div><p className="orientation-admin__kicker">{t('pathway')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div>
      <div className="orientation-admin__status"><strong>{statusLabel(status)}</strong><span>{t('draftRevision', { revision })}</span></div>
    </header>
    <p>{t('draftBoundary')}</p>
    {error ? <p className="orientation-notice orientation-notice--error" role="alert">{error === 'revisionConflict' ? t('revisionConflict') : localizedError(error, locale)}</p> : null}
    {message ? <p className="orientation-notice" role="status">{t(message.key, message.values)}</p> : null}
    <div className="orientation-admin__toolbar">
      <button type="button" onClick={() => void run(async () => { const saved = await adminIeltsOrientationClient.updateDraft({ expectedRevision: revision, content: draft }); setRevision(saved.draftRevision); setStatus(saved.status); setValidatedRevision(null); setMessage({ key: 'draftSaved' }); })} disabled={busy}>{t('saveDraft')}</button>
      <button type="button" onClick={() => void run(async () => { const result = await adminIeltsOrientationClient.validate({ expectedRevision: revision }); setIssues(result.issues); setStatus(result.status); setValidatedRevision(result.canPublish ? revision : null); setMessage({ key: result.canPublish ? 'readyToPublish' : 'resolveIssues' }); })} disabled={busy}>{t('validateDraft')}</button>
      <button type="button" className="primary" onClick={() => void run(async () => { const result = await adminIeltsOrientationClient.publish({ expectedRevision: revision, idempotencyKey: crypto.randomUUID() }); setMessage({ key: 'publishedVersion', values: { version: result.version } }); await load(); })} disabled={busy || validatedRevision !== revision}>{t('publishVersion')}</button>
      <button type="button" onClick={() => { if (window.confirm(t('archiveConfirm'))) void run(async () => { await adminIeltsOrientationClient.archive(); setMessage({ key: 'archived' }); await load(); }); }} disabled={busy || versions.length === 0}>{t('archiveRelease')}</button>
    </div>
    {issues.length > 0 ? <section className="orientation-issues" aria-label={t('validationIssues')}><h2>{t('validationIssues')}</h2><ul>{issues.map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code> {validationMessage(issue)}</li>)}</ul></section> : null}
    <div className="orientation-admin__grid">
      <aside className="orientation-slide-list" aria-label={t('orientationSlides')}>
        <div className="orientation-slide-list__heading"><h2>{t('slides')}</h2><button type="button" disabled={busy} onClick={addSlide}>{t('addSlide')}</button></div>
        <ol>{draft.slides.map((slide, index) => <li key={slide.id}><button type="button" disabled={busy} className={index === selectedIndex ? 'active' : ''} aria-current={index === selectedIndex ? 'step' : undefined} onClick={() => setSelectedIndex(index)}><span>{formatNumber(locale, index + 1)}</span><span lang="en">{slide.title}</span></button></li>)}</ol>
        <div className="orientation-slide-list__actions">
          <button type="button" onClick={() => move(-1)} disabled={busy || selectedIndex === 0}>{t('moveUp')}</button>
          <button type="button" onClick={() => move(1)} disabled={busy || selectedIndex === draft.slides.length - 1}>{t('moveDown')}</button>
          <button type="button" onClick={removeSlide} disabled={busy || draft.slides.length <= 3}>{t('deleteSlide')}</button>
        </div>
      </aside>
      <form className="orientation-editor" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
        <fieldset className="orientation-editor__fields" disabled={busy}>
        <label>{t('courseTitle')}<input lang="en" name="courseTitle" value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setValidatedRevision(null); }} /></label>
        <label>{t('courseDescription')}<textarea lang="en" name="courseDescription" value={draft.description} onChange={(event) => { setDraft({ ...draft, description: event.target.value }); setValidatedRevision(null); }} /></label>
        <hr />
        <label>{t('slideTitle')}<input lang="en" value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>
        <label>{t('stableSlug')}<input value={selected.slug} onChange={(event) => updateSelected({ slug: event.target.value })} /></label>
        <label>{t('body')}<textarea lang="en" rows={6} value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} /></label>
        <label>{t('captions')}<textarea lang="en" rows={6} value={selected.transcript} onChange={(event) => updateSelected({ transcript: event.target.value })} /></label>
        <div className="orientation-media-fields">
          <label>{t('uploadImage')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload('IMAGE', event.target.files?.[0])} /></label>
          <label>{t('uploadNarration')}<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm" onChange={(event) => upload('AUDIO', event.target.files?.[0])} /></label>
        </div>
        <label className="orientation-checkbox"><input type="checkbox" checked={selected.question !== null} onChange={(event) => updateSelected({ question: event.target.checked ? emptyQuestion : null })} /> {t('addKnowledgeCheck')}</label>
        {selected.question ? <fieldset><legend>{t('knowledgeCheck')}</legend>
          <label>{t('questionPrompt')}<input lang="en" value={selected.question.prompt} onChange={(event) => updateSelected({ question: { ...selected.question!, prompt: event.target.value } })} /></label>
          {selected.question.options.map((option, index) => <label key={index}>{t('option', { index: index + 1 })}<input lang="en" value={option} onChange={(event) => updateSelected({ question: { ...selected.question!, options: selected.question!.options.map((item, optionIndex) => optionIndex === index ? event.target.value : item) } })} /></label>)}
          <label>{t('correctOption')}<select value={selected.question.answerIndex} onChange={(event) => updateSelected({ question: { ...selected.question!, answerIndex: Number(event.target.value) } })}>{selected.question.options.map((_, index) => <option value={index} key={index}>{t('option', { index: index + 1 })}</option>)}</select></label>
          <label>{t('explanation')}<textarea lang="en" value={selected.question.explanation} onChange={(event) => updateSelected({ question: { ...selected.question!, explanation: event.target.value } })} /></label>
        </fieldset> : null}
        </fieldset>
      </form>
      <aside className="orientation-preview" aria-label={t('learnerPreview')}><p>{t('slideProgress', { current: selectedIndex + 1, total: draft.slides.length })}</p><h2 lang="en">{selected.title}</h2>{selected.imageAssetId && mediaUrls[selected.imageAssetId] ? <img src={mediaUrls[selected.imageAssetId]} alt={t('imagePreview')} width="1200" height="675" loading="lazy" /> : null}<p lang="en">{selected.body}</p><details><summary>{t('transcript')}</summary><p lang="en">{selected.transcript}</p></details>{selected.audioAssetId && mediaUrls[selected.audioAssetId] ? <audio controls src={mediaUrls[selected.audioAssetId]} /> : <p className="orientation-preview__fallback">{t('speechFallback')}</p>}</aside>
    </div>
    <section className="orientation-versions"><h2>{t('publishedVersions')}</h2>{versions.length === 0 ? <p>{t('noVersions')}</p> : <ul>{versions.map((version) => <li key={version.id}>{t('versionSummary', { version: version.version, status: statusLabel(version.status), date: formatDate(locale, version.publishedAt, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) })}</li>)}</ul>}</section>
  </section>;
}
