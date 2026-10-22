'use client';
import { useCallback, useState } from 'react';
import { dryRunManifest, vocabularyLibraryClient as api } from '../../lib/api/vocabulary-library-client';
import { ActionFeedback, ErrorNotice, Field, LoadFeedback, Pager, formText, useAction, useLoad, useVocabularyT } from './vocabulary-ui';
import type { VocabularyBatch } from './response-schemas';

export function ImportPanel() {
  const t = useVocabularyT(); const [page, setPage] = useState(1); const state = useLoad(useCallback(() => api.sources({ page }), [page]));
  const [sourceId, setSourceId] = useState(''); const [text, setText] = useState(''); const [filename, setFilename] = useState('');
  const [validation, setValidation] = useState<ReturnType<typeof dryRunManifest>>(); const [error, setError] = useState<unknown>(); const [progress, setProgress] = useState<VocabularyBatch>(); const action = useAction();
  const source = state.data?.items.find(value => value.id === sourceId);
  const authorized = source?.rightsStatus === 'APPROVED' && Boolean(source.permissionReference) && source.allowedUses.includes('EXTRACT') && source.allowedUses.includes('STORE') && source.allowedFields.includes('FORM');
  function invalidate() { setValidation(undefined); setError(undefined); setProgress(undefined); }
  return <section className="vocab-surface"><h2>{t('import')}</h2><p>{t('importHelp')}</p><LoadFeedback state={state} />
    <form className="vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => { if (!validation || !source) return; try { await api.importManifest(source, formText(form, 'filename'), validation.manifest, setProgress); } catch (failure) { setValidation(undefined); throw failure; } }); }}>
      <Field label={t('sourceTitle')}><select disabled={action.busy} value={sourceId} onChange={event => { setSourceId(event.target.value); invalidate(); }}><option value="">{t('all')}</option>{state.data?.items.map(value => <option key={value.id} value={value.id}>{value.title}</option>)}</select></Field>
      {state.data ? <Pager page={page} total={state.data.total} busy={action.busy} change={value => { setPage(value); setSourceId(''); invalidate(); }} /> : null}
      {!authorized ? <p className="vocab-rights-note">{t('blocked')}</p> : null}
      <Field label={t('file')}><input type="file" accept=".json,application/json" disabled={action.busy} onChange={event => { const file = event.target.files?.[0]; invalidate(); if (!file) return; if (file.size > 50 * 1024 * 1024) { setError(new Error('VOCABULARY_INCOMPLETE')); return; } void file.text().then(value => { setText(value); setFilename(file.name); }, setError); }} /></Field>
      <Field label={t('manifest')}><textarea value={text} rows={10} disabled={action.busy} spellCheck={false} onChange={event => { setText(event.target.value); invalidate(); }} /></Field>
      <Field label={t('sourceFilename')}><input name="filename" required value={filename} maxLength={500} disabled={action.busy} onChange={event => { setFilename(event.target.value); setValidation(undefined); }} /></Field>
      <div className="admin-toolbar"><button type="button" disabled={!authorized || !text || !filename || action.busy} onClick={() => { try { const raw: unknown = JSON.parse(text); setValidation(dryRunManifest(raw, source)); setError(undefined); } catch (failure) { setValidation(undefined); setError(failure instanceof SyntaxError ? new Error('VOCABULARY_INCOMPLETE') : failure); } }}>{t('dryRun')}</button><button disabled={!authorized || !validation || action.busy}>{t('importRows')}</button></div>
      {validation ? <p role="status">{t('dryRunReady', { rows: validation.rowCount, pages: validation.pageCount })}</p> : null}
      {progress ? <p role="status">{t('importProgress', { id: progress.id, done: progress.checkpoint, total: progress.detectedRows })}</p> : null}
      {error ? <ErrorNotice error={error} /> : null}<ActionFeedback action={action} />{action.error && progress ? <p>{t('importFailed')}</p> : null}
    </form>
  </section>;
}
