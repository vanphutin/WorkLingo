'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import type { IntermediateLessonDraft } from './lesson-model';
import { createTopicJsonTemplate, topicDraftToJson, topicJsonToDraft } from './topic-json';
import { topicJsonDiagnostics } from './topic-json-diagnostics';
import { TopicJsonRepair } from './topic-json-repair';

const MAX_BYTES = 1_000_000;
export function TopicJsonTransfer({ draft, dirty, disabled, onApply, onDirtyChange, anchorId, reviewHref }: {
  draft: IntermediateLessonDraft; dirty: boolean; disabled: boolean;
  anchorId?: string; reviewHref?: string;
  onApply: (draft: IntermediateLessonDraft) => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const id = useId();
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [errorOffset, setErrorOffset] = useState<number | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const lastApplied = useRef<IntermediateLessonDraft | null>(null);
  // A file read may finish after the administrator has edited the form.
  const latest = useRef({ draft, dirty, disabled, onApply, onDirtyChange });
  latest.current = { draft, dirty, disabled, onApply, onDirtyChange };
  const matchesApplied = applied && draft === lastApplied.current;
  useEffect(() => () => { generation.current += 1; }, []);
  function accept(next: IntermediateLessonDraft) {
    lastApplied.current = next; latest.current.onApply(next);
    pending.current = false; latest.current.onDirtyChange(false); setError(''); setErrorOffset(null); setApplied(true);
  }
  function invalid(cause: unknown, value: string) {
    const diagnostics = topicJsonDiagnostics(cause, value);
    const detail = diagnostics.map(item => `${item.path}: ${item.singleLine ? t('jsonSingleLine') : item.message}${item.line ? `\n${t('jsonLocation', { line: item.line, column: item.column! })}` : ''}`).join('\n\n');
    setError(`${t('jsonInvalid')}\n${detail}`); setErrorOffset(diagnostics.find(item => item.offset !== undefined)?.offset ?? null); setApplied(false);
  }
  const edit = (value: string) => {
    setSource(value); setError(''); setErrorOffset(null); setApplied(false);
    pending.current = value.trim().length > 0; latest.current.onDirtyChange(pending.current);
    if (!pending.current) return;
    try {
      const next = topicJsonToDraft(JSON.parse(value) as unknown);
      const current = latest.current;
      if (!current.disabled && (!current.dirty || current.draft === lastApplied.current)) accept(next);
    } catch (cause) { invalid(cause, value); }
  };
  const replaceBuffer = () => !pending.current || window.confirm(t('jsonDiscard'));
  async function load(file: File) {
    if (!replaceBuffer()) return;
    if (file.size > MAX_BYTES) { setError(t('jsonFileError')); setErrorOffset(null); return; }
    const stamp = ++generation.current;
    setLoading(true); setError(''); setErrorOffset(null); onDirtyChange(true);
    try {
      const value = await file.text();
      if (generation.current === stamp) edit(value);
    } catch { if (generation.current === stamp) setError(t('jsonFileError')); }
    finally { if (generation.current === stamp) { setLoading(false); onDirtyChange(pending.current); } }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(topicDraftToJson(draft), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'intermediate-topic.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return <details id={anchorId} tabIndex={-1} className="intermediate-card intermediate-json">
    <summary>{t('jsonTitle')}</summary>
    <p className="intermediate-help" id={`${id}-help`}>{t('jsonHelp')}</p>
    <fieldset disabled={disabled || loading || repairing} className="intermediate-form-fields">
      <legend className="intermediate-sr-only">{t('jsonTitle')}</legend>
      <div className="intermediate-field"><label htmlFor={`${id}-file`}>{t('jsonFile')}</label>
        <input id={`${id}-file`} type="file" accept=".json,application/json" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (file) void load(file);
        }} /></div>
      <div className="intermediate-field"><label htmlFor={id}>{t('jsonLabel')}</label>
        <textarea ref={input} id={id} value={source} rows={14} maxLength={MAX_BYTES} spellCheck={false} aria-describedby={`${id}-help`} onChange={event => edit(event.target.value)} /></div>
      <div className="intermediate-actions">
        <button type="button" disabled={!source.trim() || matchesApplied} onClick={() => {
          if (disabled) return;
          try {
            const next = topicJsonToDraft(JSON.parse(source) as unknown);
            if (dirty && !window.confirm(t('jsonReplace'))) return;
            accept(next);
          } catch (cause) { invalid(cause, source); }
        }}>{t('jsonApply')}</button>
        <button type="button" onClick={() => { if (replaceBuffer()) edit(JSON.stringify(createTopicJsonTemplate(), null, 2)); }}>{t('jsonTemplate')}</button>
        <button type="button" onClick={download}>{t('jsonExport')}</button>
        <button type="button" disabled={!source} onClick={() => {
          if (!replaceBuffer()) return;
          setSource(''); pending.current = false; onDirtyChange(false); setError(''); setErrorOffset(null); setApplied(false);
        }}>{t('jsonClear')}</button>
        {matchesApplied && reviewHref ? <a href={reviewHref} onClick={() => document.getElementById(reviewHref.slice(1))?.focus({ preventScroll: true })}>{t('jsonReview')}</a> : null}
      </div>
    </fieldset>
    {loading ? <p role="status">{t('busy')}</p> : null}
    {error ? <p className="intermediate-notice intermediate-error" role="alert">{error}</p> : null}
    {errorOffset !== null ? <button type="button" disabled={disabled || loading || repairing} onClick={() => {
      input.current?.focus(); input.current?.setSelectionRange(errorOffset, Math.min(errorOffset + 1, source.length));
    }}>{t('jsonGoToError')}</button> : null}
    {error && source.trim() ? <TopicJsonRepair source={source} disabled={disabled || loading} onBusyChange={setRepairing} onApply={candidate => {
      const current = latest.current;
      if (current.disabled || (current.dirty && current.draft !== lastApplied.current && !window.confirm(t('jsonReplace')))) return false;
      try { const next = topicJsonToDraft(JSON.parse(candidate) as unknown); setSource(candidate); accept(next); return true; }
      catch (cause) { invalid(cause, candidate); return false; }
    }} /> : null}
    {matchesApplied ? <p role="status">{t('jsonApplied')}</p> : null}
  </details>;
}
