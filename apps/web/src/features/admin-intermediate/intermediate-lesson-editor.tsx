'use client';

import { AdminLink as Link, useAdminNavigationGuard } from '../admin-dashboard/admin-navigation-guard';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { IntermediateCategory } from '@worklingo/content-format';
import type { ContentImportDto } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { adminIntermediateMessages } from '../../i18n/messages/adminIntermediate';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import type { Translator } from '../../i18n/translator';
import { ApiError, apiClient } from '../../lib/api/api-client';
import {
  createIntermediateLessonDraft, getIntermediateCategory, readIntermediateLesson, serializeIntermediateLesson,
  type IntermediateLessonDraft, type IntermediateLanguageBlock, type IntermediateQuestion,
} from './lesson-model';
import './intermediate-authoring.css';
import { isIntermediateTopicSource, readIntermediateTopicLesson, serializeIntermediateTopicLesson } from './topic-lesson-model';
import { TopicReviewPanel } from './topic-review-panel';
import { TopicJsonTransfer } from './topic-json-transfer';
import { TopicLessonOutline } from './topic-lesson-outline';
import { TopicGroupField } from './topic-group-field';
import { TopicAuthoringSteps } from './topic-authoring-steps';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';

type T = Translator<typeof adminIntermediateMessages>;
type Props = { category: IntermediateCategory; importId?: string; topic?: boolean; initialTopicGroupId?: string };
type LoadState = { kind: 'loading' | 'error' } | { kind: 'unsupported' | 'wrong'; record: ContentImportDto }
  | { kind: 'ready'; record: ContentImportDto | null; draft: IntermediateLessonDraft };
const focusKeys = {
  grammar: ['grammarFocus', 'grammarHelp'], pronunciation: ['pronunciationFocus', 'pronunciationHelp'],
  vocabulary: ['vocabularyFocus', 'vocabularyHelp'], reading: ['readingFocus', 'readingHelp'],
  listening: ['listeningFocus', 'listeningHelp'], speaking: ['speakingFocus', 'speakingHelp'], writing: ['writingFocus', 'writingHelp'],
} as const;

/** A record/category switch unmounts all draft state and invalidates pending work immediately. */
export function IntermediateLessonEditor({ category, importId, topic = false, initialTopicGroupId }: Props) {
  return <EditorSession key={`${topic}:${category}:${importId ?? 'new'}:${initialTopicGroupId ?? ''}`} category={category} topic={topic}
    {...(importId ? { importId } : {})} {...(initialTopicGroupId ? { initialTopicGroupId } : {})} />;
}

function EditorSession({ category, importId, topic = false, initialTopicGroupId }: Props) {
  const t = useT('adminIntermediate', adminIntermediateMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const [loaded, setLoaded] = useState<LoadState>(() => importId ? { kind: 'loading' }
    : { kind: 'ready', record: null, draft: createIntermediateLessonDraft(category) });
  useEffect(() => {
    if (!importId) return;
    let cancelled = false;
    void apiClient.getContentImport(importId).then((record) => {
      if (cancelled) return;
      if (record.id !== importId || (topic ? !isIntermediateTopicSource(record.rawSource) : getIntermediateCategory(record.rawSource) !== category)) {
        setLoaded({ kind: 'wrong', record });
        return;
      }
      const draft = topic ? readIntermediateTopicLesson(record.rawSource) : readIntermediateLesson(record.rawSource, category);
      setLoaded(draft ? { kind: 'ready', record, draft } : { kind: 'unsupported', record });
    }).catch(() => { if (!cancelled) setLoaded({ kind: 'error' }); });
    return () => { cancelled = true; };
  }, [category, importId, topic]);

  if (loaded.kind === 'ready') return <DraftForm category={category} topic={topic} initialRecord={loaded.record} initialDraft={loaded.draft}
    {...(initialTopicGroupId ? { initialTopicGroupId } : {})} />;
  return <div className="intermediate-editor">
    <Link href={`/admin/programs/intermediate/${topic ? 'topic-groups' : category}`}>{topic ? tt('back') : t('back', { category: t(category) })}</Link>
    {loaded.kind === 'loading' ? <p role="status">{t('loading')}</p> : <>
      <p role="alert" className="intermediate-notice">{t(loaded.kind === 'wrong' ? 'wrongCategory' : loaded.kind === 'unsupported' ? 'unsupported' : 'loadFailed')}</p>
      {importId && loaded.kind !== 'error' ? <Link href={`/admin/content/${importId}`}>{t('advanced')}</Link> : null}
    </>}
  </div>;
}

function Field({ label, value, onChange, multiline = false, help, numeric, max }: {
  label: string; value: string | number; onChange: (value: string) => void; multiline?: boolean; help?: string | undefined; numeric?: boolean; max?: number;
}) {
  const id = useId();
  const common = { id, value, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    'aria-describedby': help ? `${id}-help` : undefined };
  return <div className="intermediate-field">
    <label htmlFor={id}>{label}</label>
    {multiline ? <textarea {...common} rows={4} /> : <input {...common} type={numeric ? 'number' : 'text'} min={numeric ? 1 : undefined} max={max} step={numeric ? 1 : undefined} />}
    {help ? <p id={`${id}-help`} className="intermediate-help">{help}</p> : null}
  </div>;
}

const languageLabels = {
  expression: 'expression', meaningVi: 'meaningVi', pronunciation: 'pronunciationLabel', grammarPattern: 'grammarPattern',
  example: 'example', commonError: 'commonError',
} as const;
type LanguageField = keyof typeof languageLabels;
const languageOrder: Record<'grammar' | 'pronunciation' | 'vocabulary', LanguageField[]> = {
  grammar: ['grammarPattern', 'example', 'commonError', 'expression', 'meaningVi', 'pronunciation'],
  pronunciation: ['pronunciation', 'expression', 'example', 'commonError', 'meaningVi', 'grammarPattern'],
  vocabulary: ['expression', 'meaningVi', 'example', 'commonError', 'pronunciation', 'grammarPattern'],
};
function LanguageFields({ category, blocks, onChange, t }: {
  category: IntermediateCategory; blocks: IntermediateLanguageBlock[]; onChange: (blocks: IntermediateLanguageBlock[]) => void; t: T;
}) {
  const order = languageOrder[category === 'grammar' || category === 'pronunciation' ? category : 'vocabulary'];
  const update = (index: number, patch: Partial<IntermediateLanguageBlock>) => onChange(blocks.map((block, i) => i === index ? { ...block, ...patch } : block));
  return <div className="intermediate-section-body">
    {blocks.map((block, index) => <fieldset className="intermediate-item" key={index}>
      <legend>{t('languageBlock', { count: index + 1 })}</legend>
      <div className="intermediate-grid">
        {order.map((name) => <Field key={name} label={t(languageLabels[name])} value={block[name]} onChange={(value) => update(index, { [name]: value })} />)}
        <Field label={t('collocations')} value={block.collocations.join('\n')} multiline help={t('collocationsHelp')}
          onChange={(value) => update(index, { collocations: value ? value.split('\n') : [] })} />
        <Field label={t('blockSlug')} value={block.slug} help={t('slugHelp')} onChange={(value) => update(index, { slug: value })} />
      </div>
      <button type="button" disabled={blocks.length === 1} onClick={() => onChange(blocks.filter((_, i) => i !== index))}>{t('removeLanguage')}</button>
    </fieldset>)}
    <button type="button" onClick={() => onChange([...blocks, { ...createIntermediateLessonDraft(category).languageBlocks[0]!, slug: `language-${crypto.randomUUID()}` }])}>{t('addLanguage')}</button>
  </div>;
}

function Questions({ skill, questions, onChange, t, anchorPrefix }: {
  skill: 'reading' | 'listening'; questions: IntermediateQuestion[]; onChange: (questions: IntermediateQuestion[]) => void; t: T;
  anchorPrefix?: string | undefined;
}) {
  const update = (index: number, patch: Partial<IntermediateQuestion>) => onChange(questions.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <div className="intermediate-section-body">
    <h3 id={anchorPrefix ? `${anchorPrefix}-${skill}-questions` : undefined} tabIndex={anchorPrefix ? -1 : undefined}>{t(skill === 'reading' ? 'readingQuestions' : 'listeningQuestions')}</h3>
    {questions.map((question, index) => <fieldset className="intermediate-item" key={index}
      id={anchorPrefix ? `${anchorPrefix}-${skill}-question-${index + 1}` : undefined} tabIndex={anchorPrefix ? -1 : undefined}>
      <legend>{t(skill === 'reading' ? 'readingQuestion' : 'listeningQuestion', { count: index + 1 })}</legend>
      <Field label={t('question')} value={question.prompt} multiline onChange={(value) => update(index, { prompt: value })} />
      <div className="intermediate-options">
        {question.options.map((option, optionIndex) => <div className="intermediate-option" key={optionIndex}>
          <Field label={t('option', { count: optionIndex + 1 })} value={option}
            onChange={(value) => update(index, { options: question.options.map((item, i) => i === optionIndex ? value : item) })} />
          <button type="button" disabled={question.options.length <= 2} onClick={() => update(index, {
            options: question.options.filter((_, i) => i !== optionIndex),
            answerIndex: optionIndex === question.answerIndex ? 0 : question.answerIndex - (optionIndex < question.answerIndex ? 1 : 0),
          })}>{t('removeOption', { count: optionIndex + 1 })}</button>
        </div>)}
        <button type="button" disabled={question.options.length >= 10} onClick={() => update(index, { options: [...question.options, ''] })}>{t('addOption')}</button>
      </div>
      <div className="intermediate-grid">
        <label className="intermediate-field">{t('correctAnswer')}
          <select value={question.answerIndex} onChange={(event) => update(index, { answerIndex: Number(event.target.value) })}>
            {question.options.map((option, i) => <option key={i} value={i}>{t('answerOption', { count: i + 1, text: option })}</option>)}
          </select>
        </label>
        <Field label={t('evidenceLine')} value={question.evidenceLine} numeric help={t('evidenceHelp')}
          onChange={(value) => update(index, { evidenceLine: Number(value) })} />
        <Field label={t('explanation')} value={question.explanation} multiline onChange={(value) => update(index, { explanation: value })} />
        <Field label={t('questionSlug')} value={question.slug} help={t('slugHelp')} onChange={(value) => update(index, { slug: value })} />
      </div>
      <button type="button" disabled={questions.length === 1} onClick={() => onChange(questions.filter((_, i) => i !== index))}>{t('removeQuestion')}</button>
    </fieldset>)}
    <button type="button" onClick={() => {
      const key = skill === 'reading' ? 'readingQuestions' : 'listeningQuestions';
      onChange([...questions, { ...createIntermediateLessonDraft(skill)[key][0]!, slug: `${skill}-${crypto.randomUUID()}` }]);
    }}>{t('addQuestion')}</button>
  </div>;
}

function DraftForm({ category, topic, initialRecord, initialDraft, initialTopicGroupId }: {
  category: IntermediateCategory; topic: boolean; initialRecord: ContentImportDto | null; initialDraft: IntermediateLessonDraft; initialTopicGroupId?: string;
}) {
  const t = useT('adminIntermediate', adminIntermediateMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const router = useRouter();
  const [record, setRecord] = useState(initialRecord);
  const [topicGroupId, setTopicGroupId] = useState(initialRecord?.topicGroupId ?? initialTopicGroupId ?? '');
  const [groupBusy, setGroupBusy] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [savedDraft, setSavedDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);
  const [jsonDirty, setJsonDirty] = useState(false);
  const [error, setError] = useState<'conflict' | 'saveFailed' | 'invalidDraft' | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const headingId = useId();
  const target = (key: string) => topic ? { id: `${headingId}-${key}`, tabIndex: -1 } : {};
  const readOnly = record?.status === 'PUBLISHED' || record?.status === 'ARCHIVED';
  const dirty = draft !== savedDraft;
  const anyDirty = dirty || planDirty || jsonDirty || (!record && Boolean(topicGroupId) && !initialTopicGroupId);
  useAdminNavigationGuard(anyDirty, t('leaveDirty'));
  const [focusKey, helpKey] = focusKeys[category];
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);

  function update(patch: Partial<IntermediateLessonDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || inFlight.current || groupBusy || error === 'conflict' || jsonDirty) return;
    if (topic && planDirty && !window.confirm(tt('replacePlan'))) return;
    let source: string;
    try { source = topic ? serializeIntermediateTopicLesson(draft) : serializeIntermediateLesson(category, draft); }
    catch { setError('invalidDraft'); return; }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (record) {
        const updated = await apiClient.updateContentSource(record.id, { rawSource: source, expectedDraftRevision: record.draftRevision });
        if (!mounted.current) return;
        setRecord(updated);
        setSavedDraft(draft);
        setSaved(true);
      } else {
        const created = topic && topicGroupId ? await apiClient.createContentImport(source, topicGroupId) : await apiClient.createContentImport(source);
        if (!mounted.current) return;
        setSavedDraft(draft);
        setSaved(true);
        // Keep submission locked until navigation so a slow route cannot create duplicate drafts.
        router.push(`/admin/programs/intermediate/${topic ? 'topics' : category}/${created.id}`);
        return;
      }
    } catch (cause) {
      if (!mounted.current) return;
      setError(cause instanceof ApiError && cause.status === 409 ? 'conflict' : 'saveFailed');
    }
    if (mounted.current) { inFlight.current = false; setSaving(false); }
  }
  const textField = (name: 'readingText' | 'speaker' | 'dialogue' | 'activatePrompt' | 'speakingPrompt' | 'speakingModel' | 'writingPrompt' | 'writingModel', multiline = true, help?: string) => (
    <Field key={name} label={topic && name === 'readingText' ? tt('passage') : t(name)} value={draft[name]} multiline={multiline} help={help} onChange={(value) => update({ [name]: value })} />
  );
  const language = <LanguageFields category={category} blocks={draft.languageBlocks} onChange={(languageBlocks) => update({ languageBlocks })} t={t} />;
  const reading = <div className="intermediate-section-body">{textField('readingText')}
    <Questions skill="reading" questions={draft.readingQuestions} onChange={(readingQuestions) => update({ readingQuestions })} t={t} anchorPrefix={topic ? headingId : undefined} /></div>;
  const listening = <div className="intermediate-section-body">{textField('speaker', false, t('speakerHelp'))}{topic ? <p>{tt('listeningHelp')}</p> : textField('dialogue', true, t('dialogueHelp'))}
    <Questions skill="listening" questions={draft.listeningQuestions} onChange={(listeningQuestions) => update({ listeningQuestions })} t={t} anchorPrefix={topic ? headingId : undefined} /></div>;
  const speaking = <div className="intermediate-section-body">{textField('speakingPrompt')}{textField('speakingModel', false, t('modelHelp'))}</div>;
  const writing = <div className="intermediate-section-body">{textField('writingPrompt')}{textField('writingModel', false, t('modelHelp'))}</div>;
  const skills = { reading, listening, speaking, writing };
  const languagePrimary = category === 'grammar' || category === 'pronunciation' || category === 'vocabulary';

  return <div className={topic ? 'intermediate-topic-layout' : undefined}>
    {topic ? <TopicLessonOutline prefix={headingId} draft={draft} hasReview={Boolean(record)} canSave={!readOnly} /> : null}
    <div className="intermediate-editor">
    <Link href={topic ? `/admin/programs/intermediate/topic-groups${topicGroupId ? `?topicGroupId=${encodeURIComponent(topicGroupId)}` : ''}`
      : `/admin/programs/intermediate/${category}`}>{topic ? tg('changeTopic') : t('back', { category: t(category) })}</Link>
    <header className="intermediate-editor-header">
      <p className="intermediate-eyebrow">{t('program')} / {topic ? tt('title') : t(category)}</p>
      <h1>{topic ? tt(record ? 'editTitle' : 'newTitle') : t(record ? 'editTitle' : 'newTitle', { category: t(category) })}</h1>
      <p>{topic ? tt('description') : t('introduction')}</p>
      {record ? <span className="intermediate-revision">{t('revision', { count: record.draftRevision })}</span> : null}
    </header>
    {topic ? <><TopicAuthoringSteps step={record ? (readOnly ? 4 : 3) : 2} /><p className="intermediate-help">{tg(record ? 'savedFlowHelp' : 'flowHelp')}</p></> : null}
    {topic ? <TopicGroupField key={record?.id ?? 'new'} value={topicGroupId} onChange={setTopicGroupId} disabled={saving} onBusyChange={setGroupBusy} fixed={Boolean(initialTopicGroupId && !record)}
      {...(record ? { importId: record.id } : {})} /> : null}
    {readOnly ? <p className="intermediate-notice">{t('readOnly')}</p> : null}
    {error ? <p role="alert" className="intermediate-notice intermediate-error">{t(error)}</p> : null}
    {topic ? <TopicJsonTransfer anchorId={`${headingId}-json`} reviewHref={`#${headingId}-basics`} draft={draft} dirty={dirty} disabled={saving || readOnly || error === 'conflict'} onDirtyChange={setJsonDirty}
      onApply={next => { setDraft(next); setSaved(false); }} /> : null}
    {jsonDirty ? <p role="status" className="intermediate-help">{tt('jsonPending')}</p> : null}
    <form onSubmit={(event) => void save(event)}>
      <fieldset className="intermediate-form-fields" disabled={saving || readOnly}>
        <legend className="intermediate-sr-only">{t('editTitle', { category: t(category) })}</legend>
        <section className="intermediate-card" {...target('basics')}>
          <h2>{t('basics')}</h2>
          <div className="intermediate-grid">
            <Field label={t('title')} value={draft.title} onChange={(title) => update({ title })} />
            <Field label={t('slug')} value={draft.slug} help={t('slugHelp')} onChange={(slug) => update({ slug })} />
            <Field label={t('level')} value={draft.level} onChange={(level) => update({ level })} />
            {!topic ? <Field label={t('duration')} value={draft.durationMinutes} numeric max={300} onChange={(value) => update({ durationMinutes: Number(value) })} /> : <p className="intermediate-help">{tt('timeHint')}</p>}
          </div>
          <Field label={t('objective')} value={draft.objective} onChange={(objective) => update({ objective })} />
        </section>
        <section className="intermediate-card intermediate-primary" aria-labelledby={headingId} {...target('passage')}>
          <h2 id={headingId}>{topic ? tt('passage') : t(focusKey)}</h2>
          <p className="intermediate-help">{topic ? tt('passageHelp') : t(helpKey)}</p>
          {languagePrimary ? language : skills[category as keyof typeof skills]}
        </section>
        {topic ? <section className="intermediate-card intermediate-supporting">
          <h2>{tt('parts')}</h2><div {...target('warmup')}>{textField('activatePrompt')}</div>
          <section {...target('language')}><h2>{tt('language')}</h2>{language}</section>
          <section {...target('listening')}><h2>{tt('listening')}</h2>{listening}</section>
          <section {...target('speaking')}><h2>{t('speaking')}</h2>{speaking}</section>
          <section {...target('writing')}><h2>{t('writing')}</h2>{writing}</section>
        </section> : <details className="intermediate-card intermediate-supporting">
          <summary>{t('supporting')}</summary>
          <p className="intermediate-help">{t('supportingHelp')}</p>
          {textField('activatePrompt')}
          {!languagePrimary ? <section><h2>{t('language')}</h2>{language}</section> : null}
          {(['reading', 'listening', 'speaking', 'writing'] as const).filter((skill) => category !== skill).map((skill) => (
            <section key={skill}><h2>{t(skill)}</h2>{skills[skill]}</section>
          ))}
        </details>}
      </fieldset>
      {!readOnly ? <div className="intermediate-actions" {...target('save')}>
        <button className="intermediate-save" type="submit" disabled={saving || groupBusy || jsonDirty || error === 'conflict' || (Boolean(record) && !dirty)}>{t(saving ? 'saving' : record ? 'save' : 'create')}</button>
        <span role="status" aria-live="polite">{saved ? t('saved') : dirty ? t('dirty') : ''}</span>
      </div> : null}
    </form>
    {topic && record ? <div {...target('review')}><TopicReviewPanel record={record} dirty={dirty || jsonDirty} onDirtyChange={setPlanDirty} /></div> : null}
    {record ? <aside className="intermediate-card intermediate-lifecycle" {...target('lifecycle')}>
      <Link href={`/admin/content/${record.id}`}>{t('lifecycle')}</Link>
      <p className="intermediate-help">{t('lifecycleHelp')}</p>
    </aside> : null}
    </div>
  </div>;
}
