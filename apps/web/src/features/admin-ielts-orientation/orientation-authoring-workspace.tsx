'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrientationContent, OrientationSlide } from '@worklingo/contracts';

import { adminIeltsOrientationClient } from '../../lib/api/admin-ielts-orientation-client';
import { ApiError } from '../../lib/api/api-client';
import './orientation-authoring.css';

const emptyQuestion = { slug: 'knowledge-check', prompt: 'Choose the best answer.', options: ['Option one', 'Option two'], answerIndex: 0, explanation: 'Explain why this answer is correct.' };

export function OrientationAuthoringWorkspace() {
  const [draft, setDraft] = useState<OrientationContent | null>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('DRAFT');
  const [versions, setVersions] = useState<Array<{ id: string; version: number; status: string; publishedAt: string }>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const data = await adminIeltsOrientationClient.get();
    setDraft(data.draft); setRevision(data.draftRevision); setStatus(data.status); setVersions(data.versions);
    setSelectedIndex((current) => Math.min(current, data.draft.slides.length - 1));
    setValidatedRevision(data.status === 'VALIDATED' ? data.draftRevision : null);
  }, []);

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load orientation.')); }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load(); setError('The draft changed elsewhere. Latest revision loaded; review before retrying.');
      } else setError(cause instanceof Error ? cause.message : 'Operation failed.');
    } finally { setBusy(false); }
  };

  if (!draft) return <section className="orientation-loading" aria-busy="true">Loading IELTS orientation authoring…</section>;
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
    setDraft({ ...draft, slides: draft.slides.filter((_, index) => index !== selectedIndex) });
    setSelectedIndex(Math.max(0, selectedIndex - 1)); setValidatedRevision(null);
  };
  const upload = (kind: 'AUDIO' | 'IMAGE', file?: File) => {
    if (!file) return;
    void run(async () => {
      const asset = await adminIeltsOrientationClient.uploadMedia(kind, file);
      updateSelected(kind === 'AUDIO' ? { audioAssetId: asset.id } : { imageAssetId: asset.id });
      setMediaUrls((current) => ({ ...current, [asset.id]: asset.contentUrl }));
      setMessage(`${kind === 'AUDIO' ? 'Audio' : 'Image'} uploaded. Save the draft to attach it.`);
    });
  };

  return <section className="orientation-admin">
    <header className="orientation-admin__header">
      <div><p className="orientation-admin__kicker">IELTS pathway</p><h1>Orientation authoring</h1><p>Build, validate and publish the immutable introduction shown before IELTS learning.</p></div>
      <div className="orientation-admin__status"><strong>{status}</strong><span>Draft revision {revision}</span></div>
    </header>
    {error ? <p className="orientation-notice orientation-notice--error" role="alert">{error}</p> : null}
    {message ? <p className="orientation-notice" role="status">{message}</p> : null}
    <div className="orientation-admin__toolbar">
      <button type="button" onClick={() => void run(async () => { const saved = await adminIeltsOrientationClient.updateDraft({ expectedRevision: revision, content: draft }); setRevision(saved.draftRevision); setStatus(saved.status); setValidatedRevision(null); setMessage('Draft saved.'); })} disabled={busy}>Save draft</button>
      <button type="button" onClick={() => void run(async () => { const result = await adminIeltsOrientationClient.validate({ expectedRevision: revision }); setIssues(result.issues); setStatus(result.status); setValidatedRevision(result.canPublish ? revision : null); setMessage(result.canPublish ? 'Draft is ready to publish.' : 'Resolve validation issues before publishing.'); })} disabled={busy}>Validate draft</button>
      <button type="button" className="primary" onClick={() => void run(async () => { const result = await adminIeltsOrientationClient.publish({ expectedRevision: revision, idempotencyKey: crypto.randomUUID() }); setMessage(`Published version ${result.version}.`); await load(); })} disabled={busy || validatedRevision !== revision}>Publish version</button>
      <button type="button" onClick={() => void run(async () => { await adminIeltsOrientationClient.archive(); setMessage('Published version archived.'); await load(); })} disabled={busy || versions.length === 0}>Archive release</button>
    </div>
    {issues.length > 0 ? <section className="orientation-issues" aria-label="Validation issues"><h2>Validation issues</h2><ul>{issues.map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code> {issue.message}</li>)}</ul></section> : null}
    <div className="orientation-admin__grid">
      <aside className="orientation-slide-list" aria-label="Orientation slides">
        <div className="orientation-slide-list__heading"><h2>Slides</h2><button type="button" onClick={addSlide}>Add slide</button></div>
        <ol>{draft.slides.map((slide, index) => <li key={slide.id}><button type="button" className={index === selectedIndex ? 'active' : ''} aria-current={index === selectedIndex ? 'step' : undefined} onClick={() => setSelectedIndex(index)}><span>{index + 1}</span>{slide.title}</button></li>)}</ol>
        <div className="orientation-slide-list__actions">
          <button type="button" onClick={() => move(-1)} disabled={selectedIndex === 0}>Move up</button>
          <button type="button" onClick={() => move(1)} disabled={selectedIndex === draft.slides.length - 1}>Move down</button>
          <button type="button" onClick={removeSlide} disabled={draft.slides.length <= 3}>Delete slide</button>
        </div>
      </aside>
      <form className="orientation-editor" onSubmit={(event) => event.preventDefault()}>
        <label>Course title<input value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setValidatedRevision(null); }} /></label>
        <label>Course description<textarea value={draft.description} onChange={(event) => { setDraft({ ...draft, description: event.target.value }); setValidatedRevision(null); }} /></label>
        <hr />
        <label>Slide title<input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></label>
        <label>Stable slug<input value={selected.slug} onChange={(event) => updateSelected({ slug: event.target.value })} /></label>
        <label>Body<textarea rows={6} value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} /></label>
        <label>Transcript / captions<textarea rows={6} value={selected.transcript} onChange={(event) => updateSelected({ transcript: event.target.value })} /></label>
        <div className="orientation-media-fields">
          <label>Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => upload('IMAGE', event.target.files?.[0])} /></label>
          <label>Upload narration<input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm" onChange={(event) => upload('AUDIO', event.target.files?.[0])} /></label>
        </div>
        <label className="orientation-checkbox"><input type="checkbox" checked={selected.question !== null} onChange={(event) => updateSelected({ question: event.target.checked ? emptyQuestion : null })} /> Add knowledge check</label>
        {selected.question ? <fieldset><legend>Knowledge check</legend>
          <label>Question prompt<input value={selected.question.prompt} onChange={(event) => updateSelected({ question: { ...selected.question!, prompt: event.target.value } })} /></label>
          {selected.question.options.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={(event) => updateSelected({ question: { ...selected.question!, options: selected.question!.options.map((item, optionIndex) => optionIndex === index ? event.target.value : item) } })} /></label>)}
          <label>Correct option<select value={selected.question.answerIndex} onChange={(event) => updateSelected({ question: { ...selected.question!, answerIndex: Number(event.target.value) } })}>{selected.question.options.map((_, index) => <option value={index} key={index}>Option {index + 1}</option>)}</select></label>
          <label>Explanation<textarea value={selected.question.explanation} onChange={(event) => updateSelected({ question: { ...selected.question!, explanation: event.target.value } })} /></label>
        </fieldset> : null}
      </form>
      <aside className="orientation-preview" aria-label="Learner preview"><p>Slide {selectedIndex + 1} of {draft.slides.length}</p><h2>{selected.title}</h2>{selected.imageAssetId && mediaUrls[selected.imageAssetId] ? <img src={mediaUrls[selected.imageAssetId]} alt="Uploaded slide preview" /> : null}<p>{selected.body}</p><details><summary>Transcript</summary><p>{selected.transcript}</p></details>{selected.audioAssetId && mediaUrls[selected.audioAssetId] ? <audio controls src={mediaUrls[selected.audioAssetId]} /> : <p className="orientation-preview__fallback">Browser speech will read this transcript until narration is uploaded.</p>}</aside>
    </div>
    <section className="orientation-versions"><h2>Published versions</h2>{versions.length === 0 ? <p>No version published yet.</p> : <ul>{versions.map((version) => <li key={version.id}>Version {version.version} · {version.status} · {new Date(version.publishedAt).toLocaleString()}</li>)}</ul>}</section>
  </section>;
}
