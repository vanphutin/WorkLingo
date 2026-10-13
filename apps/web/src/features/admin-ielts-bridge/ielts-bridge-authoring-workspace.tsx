'use client';

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
  const updateOptions = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
  return <fieldset className="bridge-task-editor">
    <legend>Stage task</legend>
    <label>Task kind<select aria-label="Task kind" value={task.kind} onChange={(event) => onChange(defaultTask(event.target.value as IeltsBridgeTask['kind']))}>
      <option value="instruction">Instruction only</option><option value="single_choice">Single choice</option>
      <option value="multi_choice">Multiple choice</option><option value="short_text">Written response</option>
      <option value="spoken_response">Spoken response</option>
    </select></label>
    {task.kind !== 'instruction' ? <label>Prompt<textarea value={task.prompt} onChange={(event) => onChange({ ...task, prompt: event.target.value })} /></label> : null}
    {task.kind === 'single_choice' ? <>
      <label>Options, one per line<textarea value={task.options.join('\n')} onChange={(event) => onChange({ ...task, options: updateOptions(event.target.value) })} /></label>
      <label>Correct option index<input type="number" min="0" value={task.answerIndex} onChange={(event) => onChange({ ...task, answerIndex: Number(event.target.value) })} /></label>
    </> : null}
    {task.kind === 'multi_choice' ? <>
      <label>Options, one per line<textarea value={task.options.join('\n')} onChange={(event) => onChange({ ...task, options: updateOptions(event.target.value) })} /></label>
      <label>Correct indexes, comma separated<input value={task.answerIndexes.join(',')} onChange={(event) => onChange({ ...task, answerIndexes: event.target.value.split(',').map(Number).filter(Number.isInteger) })} /></label>
    </> : null}
    {task.kind === 'short_text' ? <label>Minimum words<input type="number" min="1" value={task.minWords} onChange={(event) => onChange({ ...task, minWords: Number(event.target.value) })} /></label> : null}
    {task.kind === 'spoken_response' ? <div className="bridge-editor__split">
      <label>Preparation seconds<input type="number" min="0" value={task.preparationSeconds} onChange={(event) => onChange({ ...task, preparationSeconds: Number(event.target.value) })} /></label>
      <label>Response seconds<input type="number" min="10" value={task.responseSeconds} onChange={(event) => onChange({ ...task, responseSeconds: Number(event.target.value) })} /></label>
    </div> : null}
    {task.kind === 'short_text' || task.kind === 'spoken_response' ? <>
      <label>Rubric criteria, one per line<textarea value={task.rubric.criteria.join('\n')} onChange={(event) => onChange({ ...task, rubric: { ...task.rubric, criteria: updateOptions(event.target.value) } })} /></label>
      <label>Model response<textarea value={task.rubric.modelAnswer ?? ''} onChange={(event) => onChange({ ...task, rubric: { ...task.rubric, modelAnswer: event.target.value || undefined } })} /></label>
    </> : null}
  </fieldset>;
}

export function IeltsBridgeAuthoringWorkspace() {
  const [modules, setModules] = useState<AdminIeltsBridgeModuleDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [newQuestionType, setNewQuestionType] = useState<IeltsBridgeQuestionType>('listening_form_completion');
  const [issues, setIssues] = useState<Array<{ path: string; message: string }>>([]);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => modules.find((module) => module.id === selectedId) ?? null, [modules, selectedId]);
  const stage = selected?.draft.stages[selectedStageIndex] ?? null;
  const questionTypeExists = modules.some((module) => module.draft.questionType === newQuestionType);

  const load = useCallback(async () => {
    const data = await adminIeltsBridgeClient.list();
    setModules(data);
    setSelectedId((current) => data.some((module) => module.id === current) ? current : data[0]?.id ?? null);
    setSelectedStageIndex((current) => Math.min(current, ieltsBridgeStageTypes.length - 1));
  }, []);

  useEffect(() => {
    void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load IELTS Bridge modules.')).finally(() => setLoading(false));
  }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await load(); setError('This draft changed elsewhere. The latest revision was loaded; review it before retrying.');
      } else setError(cause instanceof Error ? cause.message : 'Operation failed.');
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

  if (loading) return <section className="bridge-admin-loading" aria-busy="true">Loading IELTS Bridge authoring...</section>;

  return <section className="bridge-admin">
    <header className="bridge-admin__header">
      <div><p className="bridge-admin__kicker">IELTS curriculum</p><h1>Bridge authoring</h1><p>Teach one question type through ten ordered stages, then publish an immutable learner version.</p></div>
      {selected ? <div className="bridge-admin__status"><strong>{selected.status}</strong><span>Draft revision {selected.draftRevision}</span></div> : null}
    </header>
    {error ? <p className="bridge-notice bridge-notice--error" role="alert">{error}</p> : null}
    {message ? <p className="bridge-notice" role="status">{message}</p> : null}
    <div className="bridge-create">
      <label>Question type<select value={newQuestionType} onChange={(event) => setNewQuestionType(event.target.value as IeltsBridgeQuestionType)}>
        {ieltsBridgeQuestionTypeSchema.options.map((type) => <option key={type} value={type}>{label(type)}</option>)}
      </select></label>
      <button type="button" onClick={() => void run(async () => {
        const created = await adminIeltsBridgeClient.create({ expectedRevision: null, idempotencyKey: crypto.randomUUID(), content: createDraft(newQuestionType) });
        setModules((current) => [...current, created]); setSelectedId(created.id); setSelectedStageIndex(0); setMessage('Module draft created.');
      })} disabled={busy || questionTypeExists}>Create module</button>
      {questionTypeExists ? <span className="bridge-create__hint">This question type already has a module.</span> : null}
    </div>
    {selected && stage ? <>
      <div className="bridge-admin__toolbar">
        <button type="button" onClick={() => void run(async () => {
          const saved = await adminIeltsBridgeClient.updateDraft(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID(), content: selected.draft });
          replaceModule(saved); setValidatedRevision(null); setMessage('Draft saved.');
        })} disabled={busy}>Save draft</button>
        <button type="button" onClick={() => void run(async () => {
          const result = await adminIeltsBridgeClient.validate(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID() });
          setIssues(result.issues); setValidatedRevision(result.canPublish ? selected.draftRevision : null);
          setModules((current) => current.map((module) => module.id === selected.id ? { ...module, status: result.status } : module));
          setMessage(result.canPublish ? 'Draft is ready to publish.' : 'Resolve the validation issues before publishing.');
        })} disabled={busy}>Validate draft</button>
        <button type="button" className="primary" onClick={() => void run(async () => {
          const result = await adminIeltsBridgeClient.publish(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID() });
          setMessage(`Published version ${result.version}.`); await load();
        })} disabled={busy || validatedRevision !== selected.draftRevision}>Publish version</button>
        <button type="button" onClick={() => {
          if (window.confirm(`Archive the published release for "${selected.draft.title}"? Learners already started will remain on their pinned version.`)) {
            void run(async () => { replaceModule(await adminIeltsBridgeClient.archive(selected.id)); setMessage('Published release archived.'); });
          }
        }} disabled={busy || selected.currentPublishedVersion === null}>Archive release</button>
      </div>
      {issues.length > 0 ? <section className="bridge-issues" aria-label="Validation issues"><h2>Validation issues</h2><ul>{issues.map((issue) => <li key={`${issue.path}-${issue.message}`}><code>{issue.path}</code> {issue.message}</li>)}</ul></section> : null}
      <div className="bridge-admin__grid">
        <aside className="bridge-module-list" aria-label="IELTS Bridge modules">
          <h2>Modules</h2>
          <ul>{modules.map((module) => <li key={module.id}><button type="button" className={module.id === selected.id ? 'active' : ''} aria-current={module.id === selected.id ? 'page' : undefined} onClick={() => { setSelectedId(module.id); setSelectedStageIndex(0); setValidatedRevision(null); setIssues([]); }}><span>{label(module.draft.skill)}</span>{module.draft.title}</button></li>)}</ul>
        </aside>
        <aside className="bridge-stage-list" aria-label="Ten learning stages">
          <h2>Learning stages</h2>
          <ol>{selected.draft.stages.map((item, index) => <li key={item.slug}><button type="button" className={index === selectedStageIndex ? 'active' : ''} aria-current={index === selectedStageIndex ? 'step' : undefined} onClick={() => setSelectedStageIndex(index)}><span>{index + 1}</span>{item.title}</button></li>)}</ol>
        </aside>
        <form className="bridge-editor" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <section className="bridge-editor__module"><h2>Module details</h2>
            <label>Module title<input value={selected.draft.title} onChange={(event) => updateDraft((draft) => ({ ...draft, title: event.target.value }))} /></label>
            <label>Description<textarea value={selected.draft.description} onChange={(event) => updateDraft((draft) => ({ ...draft, description: event.target.value }))} /></label>
            <div className="bridge-editor__split"><label>Skill<input value={label(selected.draft.skill)} readOnly /></label><label>Question type<input value={label(selected.draft.questionType)} readOnly /></label></div>
            <label className="bridge-checkbox"><input type="checkbox" checked={selected.draft.required} onChange={(event) => updateDraft((draft) => ({ ...draft, required: event.target.checked }))} /> Required for Bridge completion</label>
          </section>
          <section><h2>{label(stage.type)}</h2>
            <label>Stage title<input value={stage.title} onChange={(event) => updateStage({ title: event.target.value })} /></label>
            <label>Stable slug<input value={stage.slug} onChange={(event) => updateStage({ slug: event.target.value })} /></label>
            <label>Instruction<textarea rows={5} value={stage.instruction} onChange={(event) => updateStage({ instruction: event.target.value })} /></label>
            <label>Strategy steps, one per line<textarea value={stage.strategySteps.join('\n')} onChange={(event) => updateStage({ strategySteps: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label>
            {stage.type === 'timed_practice' ? <label>Time limit in seconds<input type="number" min="30" max="1800" value={stage.timeLimitSeconds ?? 120} onChange={(event) => updateStage({ timeLimitSeconds: Number(event.target.value) })} /></label> : null}
            <TaskEditor task={stage.task} onChange={(task) => updateStage({ task })} />
            {stage.task.kind !== 'instruction' ? <fieldset><legend>Authored feedback</legend>
              <label>Correct or coaching feedback<textarea value={stage.feedback?.correct ?? ''} onChange={(event) => updateStage({ feedback: { correct: event.target.value, incorrect: stage.feedback?.incorrect ?? '' } })} /></label>
              <label>Incorrect feedback<textarea value={stage.feedback?.incorrect ?? ''} onChange={(event) => updateStage({ feedback: { correct: stage.feedback?.correct ?? '', incorrect: event.target.value } })} /></label>
            </fieldset> : null}
          </section>
        </form>
        <aside className="bridge-preview" aria-label="Learner preview">
          <p>Stage {selectedStageIndex + 1} of 10</p><h2>{stage.title}</h2><p>{stage.instruction}</p>
          {stage.strategySteps.length > 0 ? <ol>{stage.strategySteps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
          <div className="bridge-preview__task"><strong>{label(stage.task.kind)}</strong>{stage.task.kind !== 'instruction' ? <p>{stage.task.prompt}</p> : <p>Learner reads this guidance and continues.</p>}</div>
          {stage.timeLimitSeconds ? <p><strong>Timer:</strong> {stage.timeLimitSeconds} seconds</p> : null}
        </aside>
      </div>
    </> : <div className="bridge-empty"><h2>No Bridge modules yet</h2><p>Choose a question type and create the first ten-stage module.</p></div>}
  </section>;
}
