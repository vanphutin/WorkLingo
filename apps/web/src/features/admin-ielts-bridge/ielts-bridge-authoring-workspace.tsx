'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsBridgeMessages } from '../../i18n/messages/adminIeltsBridge';
import { localizedError } from '../../i18n/errors';
import { formatNumber } from '../../i18n/translator';
import type { MessageValues } from '../../i18n/translator';


import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ieltsBridgeQuestionTypeSchema,
  ieltsBridgeStageTypes,
  type AdminIeltsBridgeModuleDto,
  type IeltsBridgeModuleContent,
  type IeltsBridgeQuestionType,
  type IeltsBridgeTask,
} from '@worklingo/contracts';

import { adminIeltsBridgeClient } from '../../lib/api/admin-ielts-bridge-client';
import { ApiError } from '../../lib/api/api-client';
import './ielts-bridge-authoring.css';

type Notice = { key: keyof typeof adminIeltsBridgeMessages['en']; values?: MessageValues };

type Stage = IeltsBridgeModuleContent['stages'][number];

const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/gu, (character) => character.toUpperCase());
const defaultTask = (kind: IeltsBridgeTask['kind']): IeltsBridgeTask => {
  if (kind === 'single_choice') return { kind, prompt: 'Choose the best supported answer.', options: ['Option one', 'Option two'], answerIndex: 0 };
  if (kind === 'multi_choice') return { kind, prompt: 'Choose all supported answers.', options: ['Option one', 'Option two'], answerIndexes: [0] };
  if (kind === 'short_text') return { kind, prompt: 'Explain your reasoning.', minWords: 20, rubric: { criteria: ['Use complete evidence.'], modelAnswer: 'Add a concise model answer.' } };
  if (kind === 'spoken_response') return { kind, prompt: 'Respond clearly and develop one idea.', preparationSeconds: 20, responseSeconds: 60, rubric: { criteria: ['Answer directly.'], modelAnswer: 'Add a concise model response.' } };
  return { kind: 'instruction' };
};

const createDraft = (questionType: IeltsBridgeQuestionType): IeltsBridgeModuleContent => {
  const skill = questionType.split('_', 1)[0] as IeltsBridgeModuleContent['skill'];
  return {
    title: label(questionType), description: 'Explain the strategy, model the reasoning, then remove support gradually.',
    skill, questionType, required: false,
    stages: ieltsBridgeStageTypes.map((type) => ({
      slug: type.replaceAll('_', '-'), type, title: label(type),
      instruction: 'Add clear learner-facing guidance for this stage.',
      strategySteps: ['Use complete meaning and explain the evidence.'],
      timeLimitSeconds: type === 'timed_practice' ? 120 : null,
      task: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? defaultTask(type === 'independent_practice' ? 'short_text' : 'single_choice') : defaultTask('instruction'),
      feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? { correct: 'Explain why the response is supported.', incorrect: 'Show which evidence was missed.' } : null,
    })),
  };
};

function TaskEditor({ task, onChange }: { readonly task: IeltsBridgeTask; readonly onChange: (task: IeltsBridgeTask) => void }) {
  const t = useT('adminIeltsBridge', adminIeltsBridgeMessages);
  const updateOptions = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
  return <fieldset className="bridge-task-editor">
    <legend>{t('taskEditor')}</legend>
    <label>{t('taskKind')}<select aria-label={t('taskKind')} value={task.kind} onChange={(event) => onChange(defaultTask(event.target.value as IeltsBridgeTask['kind']))}>
      <option value="instruction">{t('instruction')}</option><option value="single_choice">{t('single_choice')}</option>
      <option value="multi_choice">{t('multi_choice')}</option><option value="short_text">{t('short_text')}</option>
      <option value="spoken_response">{t('spoken_response')}</option>
    </select></label>
    {task.kind !== 'instruction' ? <label>{t('prompt')}<textarea lang="en" value={task.prompt} onChange={(event) => onChange({ ...task, prompt: event.target.value })} /></label> : null}
    {task.kind === 'single_choice' ? <>
      <label>{t('options')}<textarea lang="en" value={task.options.join('\n')} onChange={(event) => onChange({ ...task, options: updateOptions(event.target.value) })} /></label>
      <label>{t('answerIndex')}<input type="number" min="0" value={task.answerIndex} onChange={(event) => onChange({ ...task, answerIndex: Number(event.target.value) })} /></label>
    </> : null}
    {task.kind === 'multi_choice' ? <>
      <label>{t('options')}<textarea lang="en" value={task.options.join('\n')} onChange={(event) => onChange({ ...task, options: updateOptions(event.target.value) })} /></label>
      <label>{t('answerIndexes')}<input value={task.answerIndexes.join(',')} onChange={(event) => onChange({ ...task, answerIndexes: event.target.value.split(',').map(Number).filter(Number.isInteger) })} /></label>
    </> : null}
    {task.kind === 'short_text' ? <label>{t('minWords')}<input type="number" min="1" value={task.minWords} onChange={(event) => onChange({ ...task, minWords: Number(event.target.value) })} /></label> : null}
    {task.kind === 'spoken_response' ? <div className="bridge-editor__split">
      <label>{t('preparationSeconds')}<input type="number" min="0" value={task.preparationSeconds} onChange={(event) => onChange({ ...task, preparationSeconds: Number(event.target.value) })} /></label>
      <label>{t('responseSeconds')}<input type="number" min="10" value={task.responseSeconds} onChange={(event) => onChange({ ...task, responseSeconds: Number(event.target.value) })} /></label>
    </div> : null}
    {task.kind === 'short_text' || task.kind === 'spoken_response' ? <>
      <label>{t('rubric')}<textarea lang="en" value={task.rubric.criteria.join('\n')} onChange={(event) => onChange({ ...task, rubric: { ...task.rubric, criteria: updateOptions(event.target.value) } })} /></label>
      <label>{t('modelResponse')}<textarea lang="en" value={task.rubric.modelAnswer ?? ''} onChange={(event) => onChange({ ...task, rubric: { ...task.rubric, modelAnswer: event.target.value || undefined } })} /></label>
    </> : null}
  </fieldset>;
}

export function IeltsBridgeAuthoringWorkspace() {
  const t = useT('adminIeltsBridge', adminIeltsBridgeMessages);
  const { locale } = useLocalePreference();
  const statusLabel = (value: string) => ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED'].includes(value) ? t(value as 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED') : value;
  const [modules, setModules] = useState<AdminIeltsBridgeModuleDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [newQuestionType, setNewQuestionType] = useState<IeltsBridgeQuestionType>('listening_form_completion');
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);

  const selected = useMemo(() => modules.find((module) => module.id === selectedId) ?? null, [modules, selectedId]);
  const stage = selected?.draft.stages[selectedStageIndex] ?? null;
  const questionTypeExists = modules.some((module) => module.draft.questionType === newQuestionType);
  const validationMessage = (issue: { message: string }) => {
    if (locale === 'en') return issue.message;
    switch (issue.message) {
      case 'Answer index is outside options': return t('invalidAnswerIndex');
      case 'Only timed practice must define a time limit':
      case 'Timed practice needs a limit.': return t('invalidTimer');
      case 'Practice stages require an answerable task': return t('taskRequired');
      case 'Practice stages require authored feedback': return t('feedbackRequired');
      case 'Question type must belong to the selected skill': return t('invalidSkill');
      case 'Options must be unique': return t('uniqueOptions');
    }
    const expected = issue.message.startsWith('Expected ') ? issue.message.slice(9) : null;
    if (expected && ieltsBridgeStageTypes.includes(expected as Stage['type'])) return t('expectedStage', { stage: t(expected as Stage['type']) });
    return t('invalidField');
  };

  const load = useCallback(async () => {
    const data = await adminIeltsBridgeClient.list();
    setModules(data);
    setSelectedId((current) => data.some((module) => module.id === current) ? current : data[0]?.id ?? null);
    setSelectedStageIndex((current) => Math.min(current, ieltsBridgeStageTypes.length - 1));
  }, []);

  useEffect(() => {
    void load().catch((cause) => setError(cause)).finally(() => setLoading(false));
  }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load(); setError('revisionConflict');
      } else setError(cause);
    } finally { setBusy(false); }
  };

  const replaceModule = (next: AdminIeltsBridgeModuleDto) => setModules((current) => current.map((module) => module.id === next.id ? next : module));
  const updateDraft = (transform: (draft: IeltsBridgeModuleContent) => IeltsBridgeModuleContent) => {
    if (!selected) return;
    setModules((current) => current.map((module) => module.id === selected.id ? { ...module, draft: transform(module.draft), status: 'DRAFT' } : module));
    setValidatedRevision(null); setIssues([]);
  };
  const updateStage = (patch: Partial<Stage>) => updateDraft((draft) => ({
    ...draft, stages: draft.stages.map((item, index) => index === selectedStageIndex ? { ...item, ...patch } as Stage : item),
  }));

  if (loading) return <section className="bridge-admin-loading" aria-busy="true">{t('loading')}</section>;

  return <section className="bridge-admin">
    <header className="bridge-admin__header">
      <div><p className="bridge-admin__kicker">{t('curriculum')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div>
      {selected ? <div className="bridge-admin__status"><strong>{statusLabel(selected.status)}</strong><span>{t('draftRevision', { revision: selected.draftRevision })}</span></div> : null}
    </header>
    {error ? <p className="bridge-notice bridge-notice--error" role="alert">{error === 'revisionConflict' ? t('revisionConflict') : localizedError(error, locale)}</p> : null}
    {message ? <p className="bridge-notice" role="status">{t(message.key, message.values)}</p> : null}
    <div className="bridge-create">
      <label>{t('questionType')}<select value={newQuestionType} onChange={(event) => setNewQuestionType(event.target.value as IeltsBridgeQuestionType)}>
        {ieltsBridgeQuestionTypeSchema.options.map((type) => <option key={type} value={type}>{t(type)}</option>)}
      </select></label>
      <button type="button" onClick={() => void run(async () => {
        const created = await adminIeltsBridgeClient.create({ expectedRevision: null, idempotencyKey: crypto.randomUUID(), content: createDraft(newQuestionType) });
        setModules((current) => [...current, created]); setSelectedId(created.id); setSelectedStageIndex(0); setMessage({ key: 'moduleCreated' });
      })} disabled={busy || questionTypeExists}>{t('createModule')}</button>
      {questionTypeExists ? <span className="bridge-create__hint">{t('questionTypeExists')}</span> : null}
    </div>
    {selected && stage ? <>
      <div className="bridge-admin__toolbar">
        <button type="button" onClick={() => void run(async () => {
          const saved = await adminIeltsBridgeClient.updateDraft(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID(), content: selected.draft });
          replaceModule(saved); setValidatedRevision(null); setMessage({ key: 'draftSaved' });
        })} disabled={busy}>{t('saveDraft')}</button>
        <button type="button" onClick={() => void run(async () => {
          const result = await adminIeltsBridgeClient.validate(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID() });
          setIssues(result.issues); setValidatedRevision(result.canPublish ? selected.draftRevision : null);
          setModules((current) => current.map((module) => module.id === selected.id ? { ...module, status: result.status } : module));
          setMessage({ key: result.canPublish ? 'readyToPublish' : 'resolveIssues' });
        })} disabled={busy}>{t('validateDraft')}</button>
        <button type="button" className="primary" onClick={() => void run(async () => {
          const result = await adminIeltsBridgeClient.publish(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID() });
          setMessage({ key: 'publishedVersion', values: { version: result.version } }); await load();
        })} disabled={busy || validatedRevision !== selected.draftRevision}>{t('publishVersion')}</button>
        <button type="button" onClick={() => {
          if (window.confirm(t('archiveConfirm', { title: selected.draft.title }))) {
            void run(async () => { replaceModule(await adminIeltsBridgeClient.archive(selected.id)); setMessage({ key: 'archived' }); });
          }
        }} disabled={busy || selected.currentPublishedVersion === null}>{t('archiveRelease')}</button>
      </div>
      {issues.length > 0 ? <section className="bridge-issues" aria-label={t('validationIssues')}><h2>{t('validationIssues')}</h2><ul>{issues.map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code> {validationMessage(issue)}</li>)}</ul></section> : null}
      <div className="bridge-admin__grid">
        <aside className="bridge-module-list" aria-label={t('modulesLabel')}>
          <h2>{t('modules')}</h2>
          <ul>{modules.map((module) => <li key={module.id}><button type="button" className={module.id === selected.id ? 'active' : ''} aria-current={module.id === selected.id ? 'page' : undefined} onClick={() => { setSelectedId(module.id); setSelectedStageIndex(0); setValidatedRevision(null); setIssues([]); }}><span>{t(module.draft.skill)}</span><span lang="en">{module.draft.title}</span></button></li>)}</ul>
        </aside>
        <aside className="bridge-stage-list" aria-label={t('tenStages')}>
          <h2>{t('stages')}</h2>
          <ol>{selected.draft.stages.map((item, index) => <li key={item.slug}><button type="button" className={index === selectedStageIndex ? 'active' : ''} aria-current={index === selectedStageIndex ? 'step' : undefined} onClick={() => setSelectedStageIndex(index)}><span>{formatNumber(locale, index + 1)}</span><span lang="en">{item.title}</span></button></li>)}</ol>
        </aside>
        <form className="bridge-editor" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <section className="bridge-editor__module"><h2>{t('moduleDetails')}</h2>
            <label>{t('moduleTitle')}<input lang="en" value={selected.draft.title} onChange={(event) => updateDraft((draft) => ({ ...draft, title: event.target.value }))} /></label>
            <label>{t('moduleDescription')}<textarea lang="en" value={selected.draft.description} onChange={(event) => updateDraft((draft) => ({ ...draft, description: event.target.value }))} /></label>
            <div className="bridge-editor__split"><label>{t('skill')}<input value={t(selected.draft.skill)} readOnly /></label><label>{t('questionType')}<input value={t(selected.draft.questionType)} readOnly /></label></div>
            <label className="bridge-checkbox"><input type="checkbox" checked={selected.draft.required} onChange={(event) => updateDraft((draft) => ({ ...draft, required: event.target.checked }))} /> {t('required')}</label>
          </section>
          <section><h2>{t(stage.type)}</h2>
            <label>{t('stageTitle')}<input lang="en" value={stage.title} onChange={(event) => updateStage({ title: event.target.value })} /></label>
            <label>{t('stableSlug')}<input value={stage.slug} onChange={(event) => updateStage({ slug: event.target.value })} /></label>
            <label>{t('stageInstruction')}<textarea lang="en" rows={5} value={stage.instruction} onChange={(event) => updateStage({ instruction: event.target.value })} /></label>
            <label>{t('strategySteps')}<textarea lang="en" value={stage.strategySteps.join('\n')} onChange={(event) => updateStage({ strategySteps: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label>
            {stage.type === 'timed_practice' ? <label>{t('timeLimit')}<input type="number" min="30" max="1800" value={stage.timeLimitSeconds ?? 120} onChange={(event) => updateStage({ timeLimitSeconds: Number(event.target.value) })} /></label> : null}
            <TaskEditor task={stage.task} onChange={(task) => updateStage({ task })} />
            {stage.task.kind !== 'instruction' ? <fieldset><legend>{t('feedbackEditor')}</legend>
              <label>{t('correctFeedback')}<textarea lang="en" value={stage.feedback?.correct ?? ''} onChange={(event) => updateStage({ feedback: { correct: event.target.value, incorrect: stage.feedback?.incorrect ?? '' } })} /></label>
              <label>{t('incorrectFeedback')}<textarea lang="en" value={stage.feedback?.incorrect ?? ''} onChange={(event) => updateStage({ feedback: { correct: stage.feedback?.correct ?? '', incorrect: event.target.value } })} /></label>
            </fieldset> : null}
          </section>
        </form>
        <aside className="bridge-preview" aria-label={t('learnerPreview')}>
          <p>{t('stageProgress', { current: selectedStageIndex + 1 })}</p><h2 lang="en">{stage.title}</h2><p lang="en">{stage.instruction}</p>
          {stage.strategySteps.length > 0 ? <ol>{stage.strategySteps.map((step) => <li key={step} lang="en">{step}</li>)}</ol> : null}
          <div className="bridge-preview__task"><strong>{t(stage.task.kind)}</strong>{stage.task.kind !== 'instruction' ? <p lang="en">{stage.task.prompt}</p> : <p>{t('instructionPreview')}</p>}</div>
          {stage.timeLimitSeconds ? <p><strong>{t('timer')}</strong> {t('seconds', { count: stage.timeLimitSeconds })}</p> : null}
        </aside>
      </div>
    </> : <div className="bridge-empty"><h2>{t('emptyTitle')}</h2><p>{t('emptyDescription')}</p></div>}
  </section>;
}
