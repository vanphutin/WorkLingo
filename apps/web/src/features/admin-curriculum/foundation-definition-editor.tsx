'use client';
import {useT} from '../../i18n/provider';
import {adminBeginnerMessages} from '../../i18n/messages/adminBeginner';
import type {EvidenceLessonOption} from './mission-lesson-picker';
import {useCommandKey} from '../program-platform/shared';
import { useAdminDraftGuard } from '../admin-dashboard/admin-navigation-guard';

import { useAdminCurriculum, type SystemMessage } from './i18n';

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
  readonly title?: string;
  readonly revision?: number;
}

export type FoundationEditorClient=Pick<typeof curriculumFoundationClient,'getDraft'|'saveDraft'|'validateDraft'|'publishDraft'>&{
 reviewDraft?:(missionId:string,command:{expectedRevision:number;idempotencyKey:string})=>Promise<{reviewHash:string;reviewKind:string}>;
};
interface Props {
 readonly evidenceLessons?:readonly EvidenceLessonOption[];
 readonly client?:FoundationEditorClient;
 readonly capabilities?:Partial<Record<'save'|'validate'|'review'|'publish',boolean>>;
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

export function FoundationDefinitionEditor({ missionId, missionTitle, prerequisiteOptions, onClose, client=curriculumFoundationClient, capabilities,evidenceLessons }: Props) {
  const commandKey=useCommandKey();
  const tb=useT('adminBeginner',adminBeginnerMessages);
  const [reviewedRevision,setReviewedRevision]=useState<number|null>(null);
  const permit=(action:'save'|'validate'|'review'|'publish')=>capabilities?.[action]??true;
  const { t, number, label, message: displayMessage } = useAdminCurriculum();
  const [serverDraft, setServerDraft] = useState<CurriculumDraftDto | null>(null);
  const [definition, setDefinition] = useState<CurriculumDefinitionInput>(emptyDefinition);
  const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'validating' | 'publishing'>('loading');
  const [message, setMessage] = useState<unknown>(null);
  const [error, setError] = useState<unknown>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const canLeave = useAdminDraftGuard(isDirty);

  const loadDraft = useCallback(async () => {
    setState('loading'); setError(null); setHasConflict(false); setLoadFailed(false);
    try {
      const loaded = await client.getDraft(missionId);
      setServerDraft(loaded);setReviewedRevision((loaded as CurriculumDraftDto&{reviewedRevision?:number|null}).reviewedRevision??null);
      setDefinition(loaded.definition ?? emptyDefinition);
      setIsDirty(false);
    } catch (cause) {
      setLoadFailed(true);
      setError(cause);
    } finally { setState('idle'); }
  }, [missionId,client]);

  useEffect(() => { void loadDraft(); }, [loadDraft]);

  const editDefinition = (update: (current: CurriculumDefinitionInput) => CurriculumDefinitionInput) => {
    setDefinition(update); setIsDirty(true);setReviewedRevision(null); setMessage(null);
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

  function localError(): SystemMessage | null {
    for (const [index, objective] of definition.objectives.entries()) {
      if (!objective.slug.trim()) return { key: 'objectiveSlugRequired', values: { number: index + 1 } };
      if (!objective.statement.trim()) return { key: 'objectiveStatementRequired', values: { number: index + 1 } };
      for (const evidence of objective.evidence) {
        if (!evidence.lessonVersionId.trim()) return { key: 'evidenceLessonRequired', values: { number: index + 1 } };
        if (!evidence.activitySlug.trim()) return { key: 'evidenceActivityRequired', values: { number: index + 1 } };
      }
    }
    return null;
  }

  async function run(action: 'save' | 'validate' | 'review' | 'publish') {
    if (state !== 'idle'||!permit(action)) return;
    const validationError = localError();
    if (validationError) { setError(validationError); return; }
    setState(action === 'save' ? 'saving' : action === 'validate' ? 'validating' : 'publishing');
    setError(null); setMessage(null); setHasConflict(false);
    try {
      if (action === 'save') {
        const saved = await client.saveDraft(missionId, {
          definition, expectedRevision: serverDraft?.revision ?? null, idempotencyKey: commandKey(`foundation-save:${missionId}`,{definition,expectedRevision:serverDraft?.revision??null}),
        });
        setServerDraft(saved); setReviewedRevision(null);setIsDirty(false); setMessage('Foundation draft saved.');
      } else {
        if (!serverDraft?.revision) throw new Error('Save the Foundation draft before validation or publication.');
        const command = { expectedRevision: serverDraft.revision, idempotencyKey: commandKey(`foundation-${action}:${missionId}`,{expectedRevision:serverDraft.revision}) };
        if (action === 'validate') {
          const validated = await client.validateDraft(missionId, command);
          setServerDraft(validated); setIsDirty(false); setMessage('Foundation draft validated.');
        } else if(action==='review'&&client.reviewDraft){
          await client.reviewDraft(missionId,command);setReviewedRevision(serverDraft.revision);setMessage(tb('reviewed'));
        } else {
          const published = await client.publishDraft(missionId, command);
          setServerDraft((current) => current ? { ...current, status: 'PUBLISHED', publishedRevisions: [published, ...current.publishedRevisions] } : current);
          setMessage('Foundation revision published successfully.');
        }
      }
      commandKey.reset();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setHasConflict(true); setError('The server has a newer revision. Your unsaved fields are preserved; refresh when ready.');
      } else setError(cause);
    } finally { setState('idle'); }
  }

  if (state === 'loading') return <div className="foundation-editor" aria-live="polite">{t('loadingFoundation')}</div>;

  return (
    <section className="foundation-editor" aria-label={t('foundationRegion', { name: missionTitle })}>
      <div className="foundation-editor-header">
        <div><h4>{t('foundationTitle')}</h4><p>{t('foundationSummary', { name: missionTitle, status: label(serverDraft?.status ?? 'NEW'), revision: serverDraft?.revision != null ? number(serverDraft.revision) : t('newRevision') })}</p></div>
        <button type="button" className="action-button action-button-secondary" aria-label={t('closeEditor')} onClick={() => { if (canLeave()) onClose?.(); }}>{t('close')}</button>
      </div>
      {error ? <div role="alert" className="status-card error-card">{displayMessage(error)}</div> : null}
      {loadFailed ? <button type="button" className="action-button action-button-secondary" onClick={() => void loadDraft()}>{t('retryLoading')}</button> : null}
      {message ? <div role="status" className="status-card success-card">{displayMessage(message)}</div> : null}
      {hasConflict ? <button type="button" className="action-button action-button-secondary" onClick={() => void loadDraft()}>{t('refreshDraft')}</button> : null}

      <div className="foundation-form-grid">
        <label>{t('category')}<select aria-label={t('category')} value={definition.category} onChange={(event) => editDefinition((current) => ({ ...current, category: foundationCategorySchema.parse(event.target.value) }))}>{foundationCategorySchema.options.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
      </div>
      {definition.objectives.map((objective, index) => {
        const number = index + 1;
        return <fieldset key={index} className="foundation-objective" aria-label={t('objectiveNumber', { number })}>
          <legend>{t('objectiveNumber', { number })}</legend>
          <div className="foundation-form-grid">
            <label>{t('objectiveSlug')}<input aria-label={index === 0 ? t('objectiveSlug') : t('objectiveSlugNumber', { number })} value={objective.slug} onChange={(event) => updateObjective(index, { slug: event.target.value })} /></label>
            <label>{t('required')}<input type="checkbox" aria-label={t('objectiveRequired', { number })} checked={objective.required} onChange={(event) => updateObjective(index, { required: event.target.checked })} /></label>
            <label className="foundation-wide">{t('objectiveStatement')}<textarea aria-label={index === 0 ? t('objectiveStatement') : t('objectiveStatementNumber', { number })} value={objective.statement} onChange={(event) => updateObjective(index, { statement: event.target.value })} /></label>
            <fieldset className="foundation-wide foundation-skills"><legend>{t('skills')}</legend>{skills.map((skill) => <label key={skill}><input type="checkbox" aria-label={t('objectiveSkill', { number, skill: label(skill).toLocaleLowerCase() })} checked={objective.skills.includes(skill)} onChange={(event) => updateObjective(index, { skills: event.target.checked ? [...objective.skills, skill] : objective.skills.filter((value) => value !== skill) })} /> {label(skill)}</label>)}</fieldset>
            {objective.evidence.map((evidence, evidenceIndex) => {
              const evidenceNumber = evidenceIndex + 1;
              const prefix = index === 0 && evidenceIndex === 0 ? t('evidencePrefix') : t('evidencePrefixNumber', { number, evidence: evidenceNumber });
              return <fieldset key={evidenceIndex} className="foundation-wide foundation-evidence"><legend>{t('evidenceNumber', { number: evidenceNumber })}</legend>
                <div className="foundation-form-grid">
                  <label>{t('lessonVersionId')}{evidenceLessons?<select aria-label={t('evidenceLesson', { prefix })} value={evidence.lessonVersionId} onChange={event=>updateEvidence(index,evidenceIndex,{lessonVersionId:event.target.value,activitySlug:'',languageBlockSlugs:[]})}><option value="">&mdash;</option>{evidenceLessons.map(l=><option key={l.lessonVersionId} value={l.lessonVersionId}>{l.title}</option>)}</select>:<input aria-label={t('evidenceLesson', { prefix })} value={evidence.lessonVersionId} onChange={(event) => updateEvidence(index, evidenceIndex, { lessonVersionId: event.target.value })} />}</label>
                  <label>{t('activitySlug')}{evidenceLessons?<select aria-label={t('evidenceActivity', { prefix })} value={evidence.activitySlug} onChange={event=>updateEvidence(index,evidenceIndex,{activitySlug:event.target.value,languageBlockSlugs:[]})}><option value="">&mdash;</option>{evidenceLessons.find(l=>l.lessonVersionId===evidence.lessonVersionId)?.activities.map(a=><option key={a.slug} value={a.slug}>{a.slug}</option>)}</select>:<input aria-label={t('evidenceActivity', { prefix })} value={evidence.activitySlug} onChange={(event) => updateEvidence(index, evidenceIndex, { activitySlug: event.target.value })} />}</label>
                  <label className="foundation-wide">{t('languageBlockSlugs')}{evidenceLessons?<select multiple aria-label={t('evidenceLanguageBlocks', { prefix })} value={evidence.languageBlockSlugs} onChange={event=>updateEvidence(index,evidenceIndex,{languageBlockSlugs:Array.from(event.target.selectedOptions,o=>o.value)})}>{evidenceLessons.find(l=>l.lessonVersionId===evidence.lessonVersionId)?.activities.find(a=>a.slug===evidence.activitySlug)?.languageBlockReferences.map(slug=><option key={slug} value={slug}>{slug}</option>)}</select>:<input aria-label={t('evidenceLanguageBlocks', { prefix })} value={evidence.languageBlockSlugs.join(', ')} onChange={(event) => updateEvidence(index, evidenceIndex, { languageBlockSlugs: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} />}</label>
                </div>
                {objective.evidence.length > 1 ? <button type="button" className="action-button action-button-danger" onClick={() => updateObjective(index, { evidence: objective.evidence.filter((_, itemIndex) => itemIndex !== evidenceIndex) })}>{t('removeEvidence', { number: evidenceNumber })}</button> : null}
              </fieldset>;
            })}
          </div>
          <button type="button" className="action-button action-button-secondary" disabled={objective.evidence.length >= 50} aria-label={t('addEvidenceAria', { number })} onClick={() => updateObjective(index, { evidence: [...objective.evidence, { lessonVersionId: '', activitySlug: '', languageBlockSlugs: [] }] })}>{t('addEvidence')}</button>
          {definition.objectives.length > 1 ? <button type="button" className="action-button action-button-danger" onClick={() => editDefinition((current) => ({ ...current, objectives: current.objectives.filter((_, objectiveIndex) => objectiveIndex !== index) }))}>{t('removeObjective', { number })}</button> : null}
        </fieldset>;
      })}
      <button type="button" className="action-button action-button-secondary" disabled={definition.objectives.length >= 50} onClick={addObjective}>{t('addObjective')}</button>

      <fieldset className="foundation-prerequisites"><legend>{t('prerequisites')}</legend>
        {prerequisiteOptions.length === 0 ? <p>{t('noPrerequisites')}</p> : prerequisiteOptions.map((option) => <label key={option.id}><input type="checkbox" checked={definition.prerequisiteRevisionIds.includes(option.id)} onChange={(event) => editDefinition((current) => ({ ...current, prerequisiteRevisionIds: event.target.checked ? [...current.prerequisiteRevisionIds, option.id] : current.prerequisiteRevisionIds.filter((id) => id !== option.id) }))} /> {option.title !== undefined && option.revision !== undefined ? t('prerequisiteLabel', { name: option.title, revision: option.revision }) : option.label}</label>)}
      </fieldset>

      <div className="curriculum-actions">
        <button type="button" className="action-button action-button-primary" disabled={!permit('save')||state !== 'idle'} onClick={() => void run('save')}>{state === 'saving' ? t('saving') : t('saveFoundation')}</button>
        <button type="button" className="action-button action-button-secondary" disabled={!permit('validate') || state !== 'idle' || isDirty || !serverDraft?.revision} onClick={() => void run('validate')}>{state === 'validating' ? t('validating') : t('validateFoundation')}</button>
        {client.reviewDraft?<button type="button" className="action-button action-button-secondary" disabled={!permit('review')||state!=='idle'||isDirty||serverDraft?.status!=='VALIDATED'} onClick={()=>void run('review')}>{tb('reviewUnit')}</button>:null}
        <button type="button" className="action-button action-button-primary" disabled={!permit('publish') || (!!client.reviewDraft&&reviewedRevision!==serverDraft?.revision) || state !== 'idle' || isDirty || serverDraft?.status !== 'VALIDATED'} onClick={() => void run('publish')}>{state === 'publishing' ? t('publishing') : t('publishFoundation')}</button>
      </div>
      {serverDraft?.publishedRevisions.length ? <div><h5>{t('publishedRevisions')}</h5><ul>{serverDraft.publishedRevisions.map((revision: CurriculumRevisionDto) => <li key={revision.id}>{t('revision', { count: revision.revision })} · {label(revision.status)}</li>)}</ul></div> : null}
    </section>
  );
}
