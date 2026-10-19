'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import type { intermediateTopicGroupCatalogSchema, intermediateTopicGroupSchema } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { ApiError } from '../../lib/api/api-client';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { AdminLink, useAdminNavigationGuard } from '../admin-dashboard/admin-navigation-guard';
import './intermediate-authoring.css';
import './topic-group-workspace.css';

type Catalog = z.infer<typeof intermediateTopicGroupCatalogSchema>;
type Group = z.infer<typeof intermediateTopicGroupSchema>;
const lessonBase = '/admin/programs/intermediate/topics';

export function TopicGroupWorkspace() {
  const t = useT('intermediateGroups', intermediateGroupsMessages);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState('all');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Group | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'error' | 'conflict' | 'duplicate' | null>(null);
  const [saved, setSaved] = useState(false);
  const live = useRef(false);
  const inFlight = useRef(false);
  const dirty = editor !== null && (name !== (editor === 'new' ? '' : editor.name) || description !== (editor === 'new' ? '' : editor.description));
  useAdminNavigationGuard(dirty, t('leave'));

  useEffect(() => {
    live.current = true;
    let cancelled = false;
    void topicGroupClient.catalog().then(value => {
      if (!cancelled) { setCatalog(value); setLoadFailed(false); }
    }).catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; live.current = false; };
  }, [attempt]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function canLeave() { return !dirty || window.confirm(t('leave')); }
  function openEditor(group: Group | 'new' | null) {
    if (busy || !canLeave()) return;
    setEditor(group); setName(group && group !== 'new' ? group.name : '');
    setDescription(group && group !== 'new' ? group.description : ''); setError(null); setSaved(false);
  }
  async function mutate(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null); setSaved(false);
    try { await action(); if (live.current) setSaved(true); }
    catch (failure) {
      if (live.current) setError(failure instanceof ApiError && failure.code === 'TOPIC_GROUP_NAME_CONFLICT' ? 'duplicate'
        : failure instanceof ApiError && failure.status === 409 ? 'conflict' : 'error');
    } finally { inFlight.current = false; if (live.current) setBusy(false); }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || !name.trim()) return;
    void mutate(async () => {
      const input = { name: name.trim(), description: description.trim() };
      const group = editor === 'new' ? await topicGroupClient.create(input)
        : await topicGroupClient.update(editor.id, { ...input, expectedRevision: editor.revision });
      if (!live.current) return;
      setCatalog(current => current ? { ...current, groups: [...current.groups.filter(item => item.id !== group.id), group].sort((a, b) => a.name.localeCompare(b.name)) } : current);
      setSelection(group.id); setEditor(null);
    });
  }
  function remove(group: Group) {
    if (!canLeave() || !window.confirm(t('deleteConfirm', { name: group.name }))) return;
    void mutate(async () => {
      await topicGroupClient.remove(group.id, { expectedRevision: group.revision });
      const value = await topicGroupClient.catalog();
      if (live.current) { setCatalog(value); setSelection('all'); setEditor(null); }
    });
  }
  const selectedGroup = catalog?.groups.find(group => group.id === selection);
  const lessons = catalog?.lessons.filter(lesson => (selection === 'all' || (selection === 'ungrouped' ? !lesson.groupId : lesson.groupId === selection))
    && lesson.title.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())) ?? [];
  const statusKey = { DRAFT: 'draft', VALIDATED: 'validated', PUBLISHED: 'published', ARCHIVED: 'archived' } as const;

  return <div className="intermediate-editor topic-groups">
    <header className="intermediate-editor-header"><h1>{t('title')}</h1><p>{t('help')}</p>
      <div className="intermediate-actions"><button type="button" className="intermediate-save" disabled={busy || !catalog} onClick={() => openEditor('new')}>{t('add')}</button>
        <AdminLink href={lessonBase}>{t('all')}</AdminLink></div>
    </header>
    {!catalog && !loadFailed ? <p role="status">{t('loading')}</p> : null}
    {loadFailed ? <div role="alert"><p>{t('loadError')}</p><button type="button" onClick={() => { setLoadFailed(false); setAttempt(n => n + 1); }}>{t('retry')}</button></div> : null}
    {error ? <div className="intermediate-notice intermediate-error" role="alert"><p>{t(error)}</p>
      {error === 'conflict' ? <button type="button" onClick={() => {
        if (!canLeave()) return;
        setEditor(null); setError(null); setAttempt(n => n + 1);
      }}>{t('reload')}</button> : null}</div> : null}
    {saved ? <p role="status">{t('saved')}</p> : null}
    {editor ? <form className="intermediate-card" onSubmit={save} aria-label={t(editor === 'new' ? 'add' : 'edit')}>
      <h2>{t(editor === 'new' ? 'add' : 'edit')}</h2>
      <label className="intermediate-field">{t('name')}<input value={name} onChange={e => setName(e.target.value)} required maxLength={120} disabled={busy} autoFocus /></label>
      <label className="intermediate-field">{t('description')}<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} rows={3} disabled={busy} /></label>
      <div className="intermediate-actions"><button type="submit" className="intermediate-save" disabled={busy || !name.trim()}>{t(busy ? 'busy' : 'save')}</button>
        <button type="button" disabled={busy} onClick={() => openEditor(null)}>{t('cancel')}</button></div>
    </form> : null}
    {catalog ? <div className="topic-groups-layout">
      <nav className="topic-groups-nav intermediate-card" aria-label={t('title')}>
        {[{ id: 'all', label: t('all') }, ...catalog.groups.map(group => ({ id: group.id, label: t('groupCount', { name: group.name, count: group.lessonCount }) })),
          { id: 'ungrouped', label: t('ungrouped') }].map(item => <button key={item.id} type="button" disabled={busy} aria-pressed={selection === item.id}
            onClick={() => { if (canLeave()) { setSelection(item.id); setSearch(''); setEditor(null); } }}>{item.label}</button>)}
        {!catalog.groups.length ? <p className="intermediate-help">{t('emptyGroups')}</p> : null}
      </nav>
      <section className="intermediate-card topic-group-lessons" aria-label={t('lessons')}>
        <header><h2>{selectedGroup?.name ?? t(selection === 'ungrouped' ? 'ungrouped' : 'all')}</h2>
          {selectedGroup?.description ? <p>{selectedGroup.description}</p> : null}
          <div className="intermediate-actions">
            <AdminLink href={`${lessonBase}/new`}>{t('addLesson')}</AdminLink>
            {selectedGroup ? <><button type="button" disabled={busy} onClick={() => openEditor(selectedGroup)}>{t('edit')}</button>
              <button type="button" disabled={busy} onClick={() => remove(selectedGroup)}>{t('remove')}</button></> : null}
          </div>
        </header>
        <p className="intermediate-help">{t('assignmentHelp')}</p>
        <label className="intermediate-field">{t('search')}<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <ul className="topic-group-lesson-list">{lessons.map(lesson => <li key={lesson.importId}>
          <div><AdminLink href={`${lessonBase}/${encodeURIComponent(lesson.importId)}`}>{lesson.title}</AdminLink><small>{t(statusKey[lesson.status])}</small></div>
          <label className="intermediate-field"><span className="intermediate-sr-only">{t('groupFor', { title: lesson.title })}</span>
            <select value={lesson.groupId ?? ''} disabled={busy} onChange={e => {
              const groupId = e.target.value || null;
              void mutate(async () => { const value = await topicGroupClient.assign(lesson.importId, { groupId, expectedRevision: lesson.revision });
                if (live.current) setCatalog(value); });
            }}><option value="">{t('ungrouped')}</option>{catalog.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
          </label>
        </li>)}</ul>
        {!lessons.length ? <p>{t(search ? 'noMatches' : catalog.lessons.length ? 'emptyLessons' : 'noLessons')}</p> : null}
      </section>
    </div> : null}
    <p className="intermediate-notice">{t('publication')}</p>
  </div>;
}
