'use client';
import { useCallback, useState } from 'react';
import { vocabularyUseSchema, vocabularyFieldSchema, vocabularyRightsStatusSchema } from '@worklingo/contracts';
import { vocabularyLibraryClient as api } from '../../lib/api/vocabulary-library-client';
import { ActionFeedback, Field, LoadFeedback, Pager, Status, formText, useAction, useLoad, useVocabularyT } from './vocabulary-ui';
import type { VocabularySource } from './response-schemas';

export function SourcesPanel() {
  const t = useVocabularyT(); const [page, setPage] = useState(1); const [source, setSource] = useState<VocabularySource>(); const action = useAction();
  const state = useLoad(useCallback(() => api.sources({ page }), [page]));
  return <section><LoadFeedback state={state} />{state.data ? <><div className="admin-data-table"><table><thead><tr><th>{t('sourceTitle')}</th><th>{t('provider')}</th><th>{t('status')}</th><th>{t('rightsBasis')}</th><th /></tr></thead><tbody>{state.data.items.map(item => <tr key={item.id}><td><strong>{item.title}</strong><div><code>{item.id}</code></div><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.providerName}</a></td><td>{item.providerName}</td><td><Status status={item.rightsStatus} /></td><td>{item.permissionReference ?? '—'}</td><td><button type="button" onClick={() => setSource(item)}>{t('manageRights')}</button></td></tr>)}</tbody></table>{!state.data.items.length ? <p className="admin-empty-state">{t('empty')}</p> : null}</div><Pager page={page} total={state.data.total} change={setPage} /></> : null}
    {source ? <RightsEditor key={`${source.id}-${source.revision}`} source={source} saved={next => { setSource(next); state.refresh(); }} /> : null}
    <form className="vocab-surface vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => { await api.registerSource({ providerName: formText(form, 'providerName'), title: formText(form, 'title'), sourceUrl: formText(form, 'sourceUrl'), attributionRequirements: formText(form, 'attributionRequirements') }); state.refresh(); }); }}>
      <h2>{t('registerSource')}</h2><p>{t('blocked')}</p><Field label={t('provider')}><input name="providerName" required maxLength={500} /></Field><Field label={t('sourceTitle')}><input name="title" required maxLength={500} /></Field><Field label={t('sourceUrl')}><input name="sourceUrl" type="url" required maxLength={2000} /></Field><Field label={t('attribution')}><textarea name="attributionRequirements" maxLength={2000} /></Field><button disabled={action.busy}>{t('registerSource')}</button><ActionFeedback action={action} />
    </form>
  </section>;
}
function RightsEditor({ source, saved }: { source: VocabularySource; saved: (source: VocabularySource) => void }) {
  const t = useVocabularyT(); const action = useAction();
  return <form className="vocab-surface vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => saved(await api.rights(source.id, { revision: source.revision, rightsStatus: formText(form, 'rightsStatus'), permissionReference: formText(form, 'permissionReference') || null, allowedUses: form.getAll('allowedUses'), allowedFields: form.getAll('allowedFields') }))); }}>
    <h2>{t('manageRights')}: {source.title}</h2><p>{t('rightsHelp')}</p><Field label={t('status')}><select name="rightsStatus" defaultValue={source.rightsStatus}>{vocabularyRightsStatusSchema.options.map(value => <option value={value} key={value}>{t(value)}</option>)}</select></Field><Field label={t('permissionReference')}><input name="permissionReference" defaultValue={source.permissionReference ?? ''} maxLength={500} /></Field>
    <fieldset><legend>{t('allowedUses')}</legend>{vocabularyUseSchema.options.map(value => <label className="vocab-check" key={value}><input type="checkbox" name="allowedUses" value={value} defaultChecked={source.allowedUses.includes(value)} />{t(value)}</label>)}</fieldset>
    <fieldset><legend>{t('allowedFields')}</legend>{vocabularyFieldSchema.options.map(value => <label className="vocab-check" key={value}><input type="checkbox" name="allowedFields" value={value} defaultChecked={source.allowedFields.includes(value)} />{t(value)}</label>)}</fieldset>
    <button disabled={action.busy}>{t('saveRights')}</button><ActionFeedback action={action} />
  </form>;
}
