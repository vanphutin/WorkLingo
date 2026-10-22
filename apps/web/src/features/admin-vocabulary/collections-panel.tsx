'use client';
import { useCallback, useState } from 'react';
import { vocabularyLibraryClient as api } from '../../lib/api/vocabulary-library-client';
import { ActionFeedback, Field, LoadFeedback, Pager, Status, formText, useAction, useLoad, useVocabularyT } from './vocabulary-ui';
import type { VocabularyVersion } from './response-schemas';
import { ReferenceOptions } from './reference-options';

export function CollectionsPanel({ selected }: { selected: string[] }) {
  const t = useVocabularyT(); const [page, setPage] = useState(1); const [id, setId] = useState<string>(); const state = useLoad(useCallback(() => api.collections({ page }), [page])); const action = useAction();
  return <section><p>{t('versionHelp')}</p><p>{t('selected', { count: selected.length })}</p><LoadFeedback state={state} />{state.data ? <><div className="admin-data-table"><table><thead><tr><th>{t('collectionName')}</th><th>{t('collectionType')}</th><th>{t('owner')}</th></tr></thead><tbody>{state.data.items.map(collection => <tr key={collection.id}><td><button type="button" onClick={() => setId(collection.id)}>{collection.name}</button></td><td><code>{collection.type}</code></td><td>{collection.ownerReference}</td></tr>)}</tbody></table>{!state.data.items.length ? <p className="admin-empty-state">{t('empty')}</p> : null}</div><Pager page={page} total={state.data.total} change={setPage} /></> : null}
    {id ? <Versions key={id} id={id} selected={selected} /> : null}
    <form className="vocab-surface vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => { const result = await api.createCollection({ name: formText(form, 'name'), type: formText(form, 'type'), ownerReference: formText(form, 'owner') }); setId(result.id); state.refresh(); }); }}>
      <h2>{t('createCollection')}</h2><Field label={t('collectionName')}><input name="name" required maxLength={500} /></Field><Field label={t('collectionType')}><select name="type">{(['CEFR', 'TOPIC', 'PROGRAM', 'EXAM', 'LESSON', 'PERSONAL'] as const).map(type => <option key={type} value={type}>{t(type)}</option>)}</select></Field><Field label={t('owner')}><input name="owner" required maxLength={500} /></Field><button disabled={action.busy}>{t('createCollection')}</button><ActionFeedback action={action} />
    </form>
  </section>;
}
function Versions({ id, selected }: { id: string; selected: string[] }) {
  const t = useVocabularyT(); const [page, setPage] = useState(1); const [versionId, setVersionId] = useState<string>(); const state = useLoad(useCallback(() => api.versions(id, { page }), [id, page])); const action = useAction();
  const version = state.data?.items.find(item => item.id === versionId);
  return <section className="vocab-surface" aria-label={t('versions')}><h2>{t('versions')}</h2><button type="button" disabled={!selected.length || selected.length > 500 || action.busy} onClick={() => { void action.run(async () => { const result = await api.createVersion(id, { senseIds: selected }); setVersionId(result.id); state.refresh(); }); }}>{t('createVersion')}</button><LoadFeedback state={state} />
    {state.data ? <><ul className="vocab-version-list">{state.data.items.map(item => <li key={item.id}><button type="button" aria-pressed={versionId === item.id} onClick={() => setVersionId(item.id)}>{t('version', { version: item.version })}</button> <Status status={item.status} /></li>)}</ul><Pager page={page} total={state.data.total} change={value => { setPage(value); setVersionId(undefined); }} /></> : null}
    {version ? <><h3>{t('version', { version: version.version })}</h3><div className="admin-data-table"><table><thead><tr><th>{t('form')}</th><th>{t('senses')}</th><th>{t('assignments')}</th></tr></thead><tbody>{version.members.map(member => <tr key={member.id}><td lang="en">{member.entry?.canonicalForm ?? member.lexicalEntryId}</td><td><span lang={member.sense?.definitionLanguage}>{member.sense?.definition ?? t('definitionMissing')}</span><div><code>{member.senseId}</code></div></td><td>{member.assignments?.map(assignment => <p key={assignment.id}><code>{assignment.programId}</code>: {assignment.inclusionReason}</p>)}</td></tr>)}</tbody></table></div>
      {version.status === 'DRAFT' ? <button type="button" disabled={action.busy} onClick={() => { void action.run(async () => { await api.publishVersion(version.id); state.refresh(); }); }}>{t('publishVersion')}</button> : null}
      {version.status === 'PUBLISHED' ? <VersionAssignments key={version.id} version={version} changed={state.refresh} /> : null}
      <h3>{t('bindings')}</h3><ul>{version.bindings?.map(binding => <li key={binding.id}>{Object.entries(binding).filter(([key, value]) => key !== 'id' && value).map(([key, value]) => <code key={key}>{key}: {value} </code>)}</li>)}</ul>
    </> : null}<ActionFeedback action={action} />
  </section>;
}
function VersionAssignments({ version, changed }: { version: VocabularyVersion; changed: () => void }) {
  const t = useVocabularyT(); const action = useAction(); const bindingAction = useAction();
  return <><form className="vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void action.run(async () => { await api.assign({ memberId: formText(form, 'memberId'), programId: formText(form, 'programId'), targetLevel: formText(form, 'targetLevel') || undefined, priority: Number(formText(form, 'priority')), learningGoal: formText(form, 'learningGoal'), skills: form.getAll('skills'), inclusionReason: formText(form, 'reason') }); changed(); }); }}>
    <h3>{t('assignments')}</h3><Field label={t('member')}><select name="memberId" required><option value="">{t('all')}</option>{version.members.map(member => <option key={member.id} value={member.id}>{member.entry?.canonicalForm ?? member.senseId}</option>)}</select></Field><ReferenceOptions assignment />
    <Field label={t('targetLevel')}><input name="targetLevel" maxLength={100} /></Field><Field label={t('priority')}><input type="number" name="priority" defaultValue={0} min={0} max={100} required /></Field><Field label={t('learningGoal')}><select name="learningGoal"><option value="RECEPTIVE">{t('receptive')}</option><option value="PRODUCTIVE">{t('productive')}</option><option value="BOTH">{t('both')}</option></select></Field>
    <fieldset><legend>{t('skills')}</legend>{(['READING', 'LISTENING', 'SPEAKING', 'WRITING'] as const).map(skill => <label key={skill} className="vocab-check"><input type="checkbox" name="skills" value={skill} defaultChecked={skill === 'READING'} />{t(skill)}</label>)}</fieldset><Field label={t('inclusionReason')}><textarea name="reason" required minLength={10} maxLength={2000} /></Field><button disabled={action.busy}>{t('assign')}</button><ActionFeedback action={action} />
  </form><form className="vocab-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void bindingAction.run(async () => { await api.bind(version.id, { [formText(form, 'type')]: formText(form, 'target') }); changed(); }); }}>
    <h3>{t('bindings')}</h3><Field label={t('bindingType')}><select name="type">{(['programId', 'pathId', 'levelId', 'missionId', 'lessonVersionId', 'wordBankVersionId'] as const).map(type => <option value={type} key={type}>{t(type)}</option>)}</select></Field><Field label={t('targetId')}><input name="target" required /></Field><button disabled={bindingAction.busy}>{t('bind')}</button><ActionFeedback action={bindingAction} />
  </form></>;
}
