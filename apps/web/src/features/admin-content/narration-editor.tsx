'use client';

import React, { useId, useState } from 'react';
import { narrationEvidenceIssues, narrationReviewInput, parseLessonSource, setAudioNarration, spokenScript, suggestEmailBody, type AudioScriptNode, type LessonDocumentNode } from '@worklingo/content-format';
import { BrowserSpeechControls } from '../audio/browser-speech-controls';
import { useAdminContent } from './i18n';
import styles from './narration-editor.module.css';

interface Props {
  readonly source: string;
  readonly readOnly?: boolean;
  readonly busy?: boolean;
  readonly onApply: (source: string) => Promise<boolean>;
}

export function NarrationEditor(props: Props) {
  const { t } = useAdminContent();
  const { document } = parseLessonSource(props.source);
  return <section className={styles.editor} aria-label={t('narrationTitle')}>
    <h2>{t('narrationTitle')}</h2><p>{t('narrationHelp')}</p>
    {props.readOnly ? <p role="note">{t('narrationReadOnly')}</p> : null}
    {!document.audioScripts.length ? <p>{t('noAudioScripts')}</p> : null}
    {document.audioScripts.map(script => <ScriptEditor key={`${script.slug}:${script.speechReview ?? ''}`} {...props} script={script} document={document} />)}
  </section>;
}

function ScriptEditor({ script, document, ...props }: Props & { readonly script: AudioScriptNode; readonly document: LessonDocumentNode }) {
  const { t, message } = useAdminContent();
  const id = useId();
  const [text, setText] = useState(() => spokenScript(script));
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const candidate = { ...script, spokenText: text, speechReview: '0'.repeat(64) };
  const issues = narrationEvidenceIssues(document, candidate);
  const errors = issues.filter(i => i.severity === 'error');
  const body = suggestEmailBody(script.script);
  const removed = script.script.split(/\r\n?|\n/u).filter(line => line.trim() && !text.includes(line));
  const disabled = Boolean(props.readOnly || props.busy || saving);
  function change(value: string) { setText(value); setConfirmed(false); setSaved(false); setError(null); }
  async function apply() {
    setSaving(true); setError(null); setSaved(false);
    try {
      let source: string;
      if (text === script.script) source = setAudioNarration(props.source, script.slug, undefined);
      else {
        const bytes = new TextEncoder().encode(narrationReviewInput(document, candidate));
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const stamp = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        source = setAudioNarration(props.source, script.slug, text, stamp);
      }
      if (await props.onApply(source)) { setSaved(true); setConfirmed(false); }
    } catch (err) { setError(err); }
    finally { setSaving(false); }
  }
  return <article className={styles.script}>
    <h3>{script.slug}</h3>
    <p className={styles.notice}>{t('narrationCaution')}</p>
    <details><summary>{t('narrationOriginal')}</summary><pre className={styles.text} lang="en">{script.script}</pre></details>
    {!props.readOnly ? <div className={styles.actions}>
      <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => change(script.script)}>{t('narrationVerbatim')}</button>
      {body !== null ? <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => change(body)}>{t('narrationEmailSuggestion')}</button> : null}
    </div> : null}
    <label htmlFor={id}>{t('narrationSpoken')}</label>
    <textarea id={id} className={styles.input} value={text} disabled={disabled} lang="en" onChange={e => change(e.target.value)} />
    <BrowserSpeechControls itemId={`narration-${script.slug}`} text={text} lang="en-US" />
    {removed.length ? <details open><summary>{t('narrationChanged', { count: removed.length })}</summary><ul className={styles.changes} lang="en">{removed.map((line, index) => <li key={index}>{line}</li>)}</ul></details> : null}
    {errors.length ? <div role="alert"><strong>{t('narrationEvidenceBlocked')}</strong><ul>{errors.map((i, index) => <li key={index}><span lang="en">{i.message}</span></li>)}</ul></div> : null}
    {issues.some(i => i.severity === 'warning') ? <p role="note">{t('narrationManualEvidence')}</p> : null}
    {!props.readOnly ? <>
      <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={disabled} onChange={e => setConfirmed(e.target.checked)} />{t('narrationConfirm')}</label>
      <button type="button" className="btn btn-primary" disabled={disabled || !confirmed || errors.length > 0} onClick={() => void apply()}>{t(saving ? 'saving' : 'narrationSave')}</button>
    </> : null}
    {saved ? <p role="status">{t('narrationSaved')}</p> : null}
    {error ? <p role="alert">{message(error)}</p> : null}
  </article>;
}
