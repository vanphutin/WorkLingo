'use client';
import { useCallback, useState, type FormEvent } from 'react';
import { vocabularyCefrSchema, vocabularyPosSchema, vocabularyQuerySchema } from '@worklingo/contracts';
import { vocabularyLibraryClient as api } from '../../lib/api/vocabulary-library-client';
import { Field, LoadFeedback, Pager, useLoad, useVocabularyT, formText, ErrorNotice } from './vocabulary-ui';
import type { VocabularyEntry } from './response-schemas';
import { ReferenceOptions } from './reference-options';

export function EntriesPanel({ selected, setSelected }: { selected: string[]; setSelected: (ids: string[]) => void }) {
  const t = useVocabularyT();
  const [query, setQuery] = useState(vocabularyQuerySchema.parse({}));
  const [error, setError] = useState<unknown>();
  const [detailId, setDetailId] = useState<string>();
  const state = useLoad(useCallback(() => api.entries(query), [query]));
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      const fields = Object.fromEntries(['search', 'cefr', 'pos', 'topicId', 'programId', 'sourceId', 'reviewStatus'].map(key => [key, formText(form, key) || undefined]));
      setQuery(vocabularyQuerySchema.parse({ ...fields, page: 1, limit: 25 })); setSelected([]); setDetailId(undefined); setError(undefined);
    } catch (failure) { setError(failure); }
  }
  const toggle = (entry: VocabularyEntry, checked: boolean) => setSelected(checked ? [...new Set([...selected, ...entry.senses.map(sense => sense.id)])] : selected.filter(id => !entry.senses.some(sense => sense.id === id)));
  return <section><form className="admin-filter-bar" onSubmit={search}>
    <Field label={t('searchVocabulary')}><input name="search" maxLength={200} type="search" /></Field>
    <Field label={t('cefr')}><select name="cefr"><option value="">{t('all')}</option>{vocabularyCefrSchema.options.map(value => <option key={value}>{value}</option>)}</select></Field>
    <Field label={t('pos')}><select name="pos"><option value="">{t('all')}</option>{vocabularyPosSchema.options.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></Field>
    <ReferenceOptions />
    <Field label={t('source')}><input name="sourceId" /></Field>
    <Field label={t('reviewStatus')}><select name="reviewStatus"><option value="">{t('all')}</option><option value="DRAFT">{t('draft')}</option><option value="REVIEWED">{t('reviewed')}</option></select></Field>
    <button type="submit">{t('search')}</button>
  </form>{error ? <ErrorNotice error={error} /> : null}
    <div className="admin-toolbar"><p role="status">{t('selected', { count: selected.length })}</p><button type="button" disabled={!selected.length} onClick={() => setSelected([])}>{t('clear')}</button></div>
    <LoadFeedback state={state} />
    {state.data ? <><div className="admin-data-table"><table><caption className="sr-only">{t('title')}</caption><thead><tr><th><input type="checkbox" aria-label={t('selectPage')} disabled={!state.data.items.some(entry => entry.senses.length)} checked={state.data.items.some(entry => entry.senses.length) && state.data.items.every(entry => entry.senses.every(sense => selected.includes(sense.id)))} onChange={event => { const ids = state.data!.items.flatMap(entry => entry.senses.map(sense => sense.id)); setSelected(event.target.checked ? [...new Set([...selected, ...ids])] : selected.filter(id => !ids.includes(id))); }} /></th><th>{t('form')}</th><th>{t('pos')}</th><th>{t('cefr')}</th><th>{t('senses')}</th><th>{t('status')}</th></tr></thead><tbody>{state.data.items.map(entry => <tr key={entry.id}><td><input type="checkbox" disabled={!entry.senses.length} aria-label={t('select', { name: entry.canonicalForm })} checked={entry.senses.length > 0 && entry.senses.every(sense => selected.includes(sense.id))} onChange={event => toggle(entry, event.target.checked)} /></td><td><button type="button" className="vocab-word" onClick={() => setDetailId(entry.id)} lang={entry.language}>{entry.canonicalForm}</button></td><td><code>{entry.partOfSpeech}</code></td><td>{[...new Set(entry.cefrAssociations.map(item => item.cefrLevel))].join(', ')}</td><td>{entry.senses.length}</td><td>{entry.editorialStatus === 'REVIEWED' ? t('reviewed') : t('draft')}</td></tr>)}</tbody></table>{!state.data.items.length ? <p className="admin-empty-state">{t('empty')}</p> : null}</div><Pager page={query.page} total={state.data.total} change={page => { setQuery({ ...query, page }); setSelected([]); setDetailId(undefined); }} /></> : null}
    {detailId ? <EntryDetail key={detailId} id={detailId} close={() => setDetailId(undefined)} /> : null}
  </section>;
}
function EntryDetail({ id, close }: { id: string; close: () => void }) {
  const t = useVocabularyT(); const state = useLoad(useCallback(() => api.entry(id), [id]));
  return <section className="vocab-surface" aria-label={t('details')}><div className="admin-context-section"><h2>{t('details')}</h2><button type="button" onClick={close}>{t('close')}</button></div><LoadFeedback state={state} />{state.data ? <>
    <h3 lang={state.data.language}>{state.data.canonicalForm}</h3><h4>{t('senses')}</h4><ol>{state.data.senses.map(sense => <li key={sense.id}><p lang={sense.definitionLanguage}>{sense.definition ?? t('definitionMissing')}</p>{sense.translation ? <p>{sense.translation}</p> : null}<small>{t('rightsBasis')}: {sense.rightsBasis}</small><div><code>{sense.id}</code></div></li>)}</ol>
    <h4>{t('pronunciation')}</h4>{state.data.pronunciations.map(value => <p key={value.id}><span>{value.ipa}</span> <span>{value.dialect}</span> <small>{t('rightsBasis')}: {value.rightsBasis}</small></p>)}
    <EntryProvenance id={id} />
  </> : null}</section>;
}
function EntryProvenance({ id }: { id: string }) {
  const t = useVocabularyT(); const [page, setPage] = useState(1);
  const state = useLoad(useCallback(() => api.provenance(id, { page }), [id, page]));
  return <section aria-label={t('provenance')}><h4>{t('provenance')}</h4><LoadFeedback state={state} />{state.data ? <>
    {state.data.items.map(value => {
      const occurrence = value.sourceEntry;
      const source = occurrence.document.source;
      const location = typeof occurrence.sourceLineStart === 'number' && typeof occurrence.sourceLineEnd === 'number'
        ? t('sourceLines', { start: occurrence.sourceLineStart, end: occurrence.sourceLineEnd }) : null;
      return <article className="vocab-provenance" key={occurrence.id}><strong>{source.title}</strong><p>{occurrence.document.originalFilename}</p><p>{occurrence.originalTopic} · {location ?? t('pageNumber', { page: occurrence.pageIndex + 1 })}</p><p>{t('raw')}: <span lang="en">{occurrence.rawWord}</span></p><code>{occurrence.document.sha256}</code><p><code>{occurrence.sourceEntryKey}</code></p>{location === null ? occurrence.locations.map((coordinates, index) => <code key={index}>{coordinates.pageIndex + 1}: [{coordinates.bbox.join(', ')}] </code>) : null}<p>{t('rightsBasis')}: {source.permissionReference}</p>{source.attributionRequirements ? <p>{t('attribution')}: {source.attributionRequirements}</p> : null}</article>;
    })}
    <Pager page={page} total={state.data.total} limit={state.data.limit} change={setPage} />
  </> : null}</section>;
}
