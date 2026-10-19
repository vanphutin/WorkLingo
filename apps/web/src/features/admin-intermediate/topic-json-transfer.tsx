'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { z } from 'zod';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import type { IntermediateLessonDraft } from './lesson-model';
import { createTopicJsonTemplate, topicDraftToJson, topicJsonToDraft } from './topic-json';

const MAX_BYTES = 1_000_000;
export function TopicJsonTransfer({ draft, dirty, disabled, onApply, onDirtyChange, anchorId }: {
  draft: IntermediateLessonDraft; dirty: boolean; disabled: boolean;
  anchorId?: string;
  onApply: (draft: IntermediateLessonDraft) => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const id = useId();
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  const edit = (value: string) => {
    setSource(value); setError(''); setApplied(false);
    pending.current = value.trim().length > 0; onDirtyChange(pending.current);
  };
  const replaceBuffer = () => !pending.current || window.confirm(t('jsonDiscard'));
  async function load(file: File) {
    if (!replaceBuffer()) return;
    if (file.size > MAX_BYTES) { setError(t('jsonFileError')); return; }
    const stamp = ++generation.current;
    setLoading(true); setError(''); onDirtyChange(true);
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
    <fieldset disabled={disabled || loading} className="intermediate-form-fields">
      <legend className="intermediate-sr-only">{t('jsonTitle')}</legend>
      <div className="intermediate-field"><label htmlFor={`${id}-file`}>{t('jsonFile')}</label>
        <input id={`${id}-file`} type="file" accept=".json,application/json" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (file) void load(file);
        }} /></div>
      <div className="intermediate-field"><label htmlFor={id}>{t('jsonLabel')}</label>
        <textarea id={id} value={source} rows={14} maxLength={MAX_BYTES} spellCheck={false} aria-describedby={`${id}-help`} onChange={event => edit(event.target.value)} /></div>
      <div className="intermediate-actions">
        <button type="button" disabled={!source.trim()} onClick={() => {
          try {
            const next = topicJsonToDraft(JSON.parse(source) as unknown);
            if (dirty && !window.confirm(t('jsonReplace'))) return;
            onApply(next); pending.current = false; onDirtyChange(false); setError(''); setApplied(true);
          } catch (cause) {
            const detail = cause instanceof z.ZodError ? cause.issues.slice(0, 5).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') : '';
            setError(`${t('jsonInvalid')}${detail ? `\n${detail}` : ''}`); setApplied(false);
          }
        }}>{t('jsonApply')}</button>
        <button type="button" onClick={() => { if (replaceBuffer()) edit(JSON.stringify(createTopicJsonTemplate(), null, 2)); }}>{t('jsonTemplate')}</button>
        <button type="button" onClick={download}>{t('jsonExport')}</button>
        <button type="button" disabled={!source} onClick={() => {
          if (!replaceBuffer()) return;
          setSource(''); pending.current = false; onDirtyChange(false); setError(''); setApplied(false);
        }}>{t('jsonClear')}</button>
      </div>
    </fieldset>
    {loading ? <p role="status">{t('busy')}</p> : null}
    {error ? <p className="intermediate-notice intermediate-error" role="alert">{error}</p> : null}
    {applied ? <p role="status">{t('jsonApplied')}</p> : null}
  </details>;
}
