'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  foundationCategorySchema,
  type CurriculumDefinitionInput,
  type CurriculumDraftDto,
  type CurriculumRevisionDto,
} from '@worklingo/contracts';

import { ApiError } from '../../lib/api/api-client';
import { curriculumFoundationClient } from '../../lib/api/curriculum-foundation-client';

export interface PrerequisiteOption {
  readonly id: string;
  readonly label: string;
}

interface Props {
  readonly missionId: string;
  readonly missionTitle: string;
  readonly prerequisiteOptions: readonly PrerequisiteOption[];
  readonly onClose?: (() => void) | undefined;
}

const emptyDefinition: CurriculumDefinitionInput = {
  category: 'grammar', prerequisiteRevisionIds: [], objectives: [{
    slug: '', statement: '', skills: ['reading'], required: true,
    evidence: [{ lessonVersionId: '', activitySlug: '', languageBlockSlugs: [] }],
  }],
};
const skills = ['reading', 'listening', 'speaking', 'writing'] as const;
type Objective = CurriculumDefinitionInput['objectives'][number];

export function FoundationDefinitionEditor({ missionId, missionTitle, prerequisiteOptions, onClose }: Props) {
  const [serverDraft, setServerDraft] = useState<CurriculumDraftDto | null>(null);
  const [definition, setDefinition] = useState<CurriculumDefinitionInput>(emptyDefinition);
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'validating' | 'publishing'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const loadDraft = useCallback(async () => {
    setState('loading'); setError(null); setHasConflict(false); setLoadFailed(false);
    try {
      const loaded = await curriculumFoundationClient.getDraft(missionId);
      setServerDraft(loaded);
      setDefinition(loaded.definition ?? emptyDefinition);
      setIsDirty(false);
    } catch (cause) {
      setLoadFailed(true);
      setError(cause instanceof Error ? cause.message : 'Could not load Foundation draft.');
    } finally { setState('idle'); }
  }, [missionId]);

  useEffect(() => { void loadDraft(); }, [loadDraft]);

  const editDefinition = (update: (current: CurriculumDefinitionInput) => CurriculumDefinitionInput) => {
    setDefinition(update); setIsDirty(true); setMessage(null);
  };
  const updateObjective = (index: number, patch: Partial<Objective>) => editDefinition((current) => ({
    ...current, objectives: current.objectives.map((objective, objectiveIndex) => objectiveIndex === index ? { ...objective, ...patch } : objective),
  }));
  const updateEvidence = (objectiveIndex: number, evidenceIndex: number, patch: Partial<Objective['evidence'][number]>) => {
    const objective = definition.objectives[objectiveIndex]!;
    updateObjective(objectiveIndex, { evidence: objective.evidence.map((item, index) => index === evidenceIndex ? { ...item, ...patch } : item) });
  };
  const addObjective = () => editDefinition((current) => ({ ...current, objectives: [...current.objectives, {
    slug: '', statement: '', skills: ['reading'], required: false,
    evidence: [{ lessonVersionId: '', activitySlug: '', languageBlockSlugs: [] }],
  }] }));

  function localError(): string | null {
    for (const [index, objective] of definition.objectives.entries()) {
      if (!objective.slug.trim()) return `Objective ${index + 1} slug is required.`;
      if (!objective.statement.trim()) return `Objective ${index + 1} statement is required.`;
      for (const evidence of objective.evidence) {
        if (!evidence.lessonVersionId.trim()) return `Lesson version ID is required for objective ${index + 1} evidence mapping.`;
        if (!evidence.activitySlug.trim()) return `Activity slug is required for objective ${index + 1} evidence mapping.`;
      }
    }
    return null;
  }

  async function run(action: 'save' | 'validate' | 'publish') {
    if (state !== 'idle') return;
    const validationError = localError();
    if (validationError) { setError(validationError); return; }
    setState(action === 'save' ? 'saving' : action === 'validate' ? 'validating' : 'publishing');
    setError(null); setMessage(null); setHasConflict(false);
    try {
      if (action === 'save') {
        const saved = await curriculumFoundationClient.saveDraft(missionId, {
          definition, expectedRevision: serverDraft?.revision ?? null, idempotencyKey: crypto.randomUUID(),
        });
        setServerDraft(saved); setIsDirty(false); setMessage('Foundation draft saved.');
      } else {
        if (!serverDraft?.revision) throw new Error('Save the Foundation draft before validation or publication.');
        const command = { expectedRevision: serverDraft.revision, idempotencyKey: crypto.randomUUID() };
        if (action === 'validate') {
          const validated = await curriculumFoundationClient.validateDraft(missionId, command);
          setServerDraft(validated); setIsDirty(false); setMessage('Foundation draft validated.');
        } else {
          const published = await curriculumFoundationClient.publishDraft(missionId, command);
          setServerDraft((current) => current ? { ...current, status: 'PUBLISHED', publishedRevisions: [published, ...current.publishedRevisions] } : current);
          setMessage('Foundation revision published successfully.');
        }
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setHasConflict(true); setError('The server has a newer revision. Your unsaved fields are preserved; refresh when ready.');
      } else setError(cause instanceof Error ? cause.message : 'Foundation command failed.');
    } finally { setState('idle'); }
  }

  if (state === 'loading') return <div className="foundation-editor" aria-live="polite">Loading Foundation definition…</div>;

  return (
    <section className="foundation-editor" aria-label={`Foundation definition for ${missionTitle}`}>
      <div className="foundation-editor-header">
        <div><h4>Foundation Definition</h4><p>{missionTitle} · {serverDraft?.status ?? 'NEW'} · revision {serverDraft?.revision ?? 'new'}</p></div>
        <button type="button" className="action-button action-button-secondary" aria-label="Close Foundation editor" onClick={onClose}>Close</button>
      </div>
      {error ? <div role="alert" className="status-card error-card">{error}</div> : null}
      {loadFailed ? <button type="button" className="action-button action-button-secondary" onClick={() => void loadDraft()}>Retry loading</button> : null}
      {message ? <div role="status" className="status-card success-card">{message}</div> : null}
      {hasConflict ? <button type="button" className="action-button action-button-secondary" onClick={() => void loadDraft()}>Refresh server draft</button> : null}

      <div className="foundation-form-grid">
        <label>Foundation category<select aria-label="Foundation category" value={definition.category} onChange={(event) => editDefinition((current) => ({ ...current, category: foundationCategorySchema.parse(event.target.value) }))}>{foundationCategorySchema.options.map((category) => <option key={category}>{category}</option>)}</select></label>
      </div>
      {definition.objectives.map((objective, index) => {
        const number = index + 1;
        return <fieldset key={index} className="foundation-objective" aria-label={`Objective ${number}`}>
          <legend>Objective {number}</legend>
          <div className="foundation-form-grid">
            <label>Objective slug<input aria-label={index === 0 ? 'Objective slug' : `Objective ${number} slug`} value={objective.slug} onChange={(event) => updateObjective(index, { slug: event.target.value })} /></label>
            <label>Required<input type="checkbox" aria-label={`Objective ${number} required`} checked={objective.required} onChange={(event) => updateObjective(index, { required: event.target.checked })} /></label>
            <label className="foundation-wide">Objective statement<textarea aria-label={index === 0 ? 'Objective statement' : `Objective ${number} statement`} value={objective.statement} onChange={(event) => updateObjective(index, { statement: event.target.value })} /></label>
            <fieldset className="foundation-wide foundation-skills"><legend>Skills</legend>{skills.map((skill) => <label key={skill}><input type="checkbox" aria-label={`Objective ${number} ${skill}`} checked={objective.skills.includes(skill)} onChange={(event) => updateObjective(index, { skills: event.target.checked ? [...objective.skills, skill] : objective.skills.filter((value) => value !== skill) })} /> {skill}</label>)}</fieldset>
            {objective.evidence.map((evidence, evidenceIndex) => {
              const evidenceNumber = evidenceIndex + 1;
              const prefix = index === 0 && evidenceIndex === 0 ? 'Objective evidence' : `Objective ${number} evidence ${evidenceNumber}`;
              return <fieldset key={evidenceIndex} className="foundation-wide foundation-evidence"><legend>Evidence {evidenceNumber}</legend>
                <div className="foundation-form-grid">
                  <label>Lesson version ID<input aria-label={`${prefix} lesson version`} value={evidence.lessonVersionId} onChange={(event) => updateEvidence(index, evidenceIndex, { lessonVersionId: event.target.value })} /></label>
                  <label>Activity slug<input aria-label={`${prefix} activity`} value={evidence.activitySlug} onChange={(event) => updateEvidence(index, evidenceIndex, { activitySlug: event.target.value })} /></label>
                  <label className="foundation-wide">Language Block slugs<input aria-label={`${prefix} language blocks`} value={evidence.languageBlockSlugs.join(', ')} onChange={(event) => updateEvidence(index, evidenceIndex, { languageBlockSlugs: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></label>
                </div>
                {objective.evidence.length > 1 ? <button type="button" className="action-button action-button-danger" onClick={() => updateObjective(index, { evidence: objective.evidence.filter((_, itemIndex) => itemIndex !== evidenceIndex) })}>Remove evidence {evidenceNumber}</button> : null}
              </fieldset>;
            })}
          </div>
          <button type="button" className="action-button action-button-secondary" disabled={objective.evidence.length >= 50} aria-label={`Add evidence mapping to objective ${number}`} onClick={() => updateObjective(index, { evidence: [...objective.evidence, { lessonVersionId: '', activitySlug: '', languageBlockSlugs: [] }] })}>Add evidence mapping</button>
          {definition.objectives.length > 1 ? <button type="button" className="action-button action-button-danger" onClick={() => editDefinition((current) => ({ ...current, objectives: current.objectives.filter((_, objectiveIndex) => objectiveIndex !== index) }))}>Remove objective {number}</button> : null}
        </fieldset>;
      })}
      <button type="button" className="action-button action-button-secondary" disabled={definition.objectives.length >= 50} onClick={addObjective}>Add objective</button>

      <fieldset className="foundation-prerequisites"><legend>Prerequisite published revisions</legend>
        {prerequisiteOptions.length === 0 ? <p>No eligible prerequisite revisions are available.</p> : prerequisiteOptions.map((option) => <label key={option.id}><input type="checkbox" checked={definition.prerequisiteRevisionIds.includes(option.id)} onChange={(event) => editDefinition((current) => ({ ...current, prerequisiteRevisionIds: event.target.checked ? [...current.prerequisiteRevisionIds, option.id] : current.prerequisiteRevisionIds.filter((id) => id !== option.id) }))} /> {option.label}</label>)}
      </fieldset>

      <div className="curriculum-actions">
        <button type="button" className="action-button action-button-primary" disabled={state !== 'idle'} onClick={() => void run('save')}>{state === 'saving' ? 'Saving…' : 'Save Foundation draft'}</button>
        <button type="button" className="action-button action-button-secondary" disabled={state !== 'idle' || isDirty || !serverDraft?.revision} onClick={() => void run('validate')}>{state === 'validating' ? 'Validating…' : 'Validate Foundation draft'}</button>
        <button type="button" className="action-button action-button-primary" disabled={state !== 'idle' || isDirty || serverDraft?.status !== 'VALIDATED'} onClick={() => void run('publish')}>{state === 'publishing' ? 'Publishing…' : 'Publish Foundation revision'}</button>
      </div>
      {serverDraft?.publishedRevisions.length ? <div><h5>Published revisions</h5><ul>{serverDraft.publishedRevisions.map((revision: CurriculumRevisionDto) => <li key={revision.id}>Revision {revision.revision} · {revision.status}</li>)}</ul></div> : null}
    </section>
  );
}
