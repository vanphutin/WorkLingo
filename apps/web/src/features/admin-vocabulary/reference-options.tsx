'use client';
import { useCallback, useState } from 'react';
import { vocabularyLibraryClient as api } from '../../lib/api/vocabulary-library-client';
import { Field, LoadFeedback, useLoad, useVocabularyT } from './vocabulary-ui';

/** Both option lists are bounded server-side; search and paging reach later existing identities. */
export function ReferenceOptions({ assignment = false, topicOnly = false }: { assignment?: boolean; topicOnly?: boolean }) {
  const t = useVocabularyT(); const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [program, setProgram] = useState<{ id: string; name: string }>();
  const [topic, setTopic] = useState<{ id: string; name: string }>();
  const state = useLoad(useCallback(() => api.options({ page, limit: 25, search }), [page, search]));
  const programs = state.data?.programs ?? []; const topics = state.data?.topics ?? [];
  return <div className="vocab-reference"><Field label={t('optionSearch')}><input type="search" value={search} maxLength={200} onChange={event => { setSearch(event.target.value); setPage(1); }} /></Field><LoadFeedback state={state} />
    {!topicOnly ? <Field label={assignment ? t('assignmentProgram') : t('program')}><select name="programId" required={assignment} value={program?.id ?? ''} onChange={event => setProgram(programs.find(option => option.id === event.target.value))}><option value="">{t('all')}</option>{program && !programs.some(option => option.id === program.id) ? <option value={program.id}>{program.name}</option> : null}{programs.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></Field> : null}
    {!assignment ? <Field label={t('topic')}><select name="topicId" value={topic?.id ?? ''} onChange={event => setTopic(topics.find(option => option.id === event.target.value))}><option value="">{t('all')}</option>{topic && !topics.some(option => option.id === topic.id) ? <option value={topic.id}>{topic.name}</option> : null}{topics.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></Field> : null}
    <small>{t('optionsHelp', { page })}</small><div className="admin-toolbar"><button type="button" disabled={state.loading || page === 1} onClick={() => setPage(value => value - 1)}>{t('optionsPrevious')}</button><button type="button" disabled={state.loading || !state.data || Math.max(state.data.programs.length, state.data.topics.length) < 25} onClick={() => setPage(value => value + 1)}>{t('optionsNext')}</button></div>
  </div>;
}
