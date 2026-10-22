'use client';
import { useAdminDraftGuard, AdminLink } from '../admin-dashboard/admin-navigation-guard';
import { AdminPageHeader } from '../admin-experience/admin-patterns';

import { INITIAL_IELTS_BAND_CURRICULUM, ieltsBandCurriculumContentSchema, type AdminIeltsBandCurriculumDto, type IeltsBandStage } from '@worklingo/contracts';
import { useEffect, useState } from 'react';
import { ZodError } from 'zod';
import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsBandMessages } from '../../i18n/messages/adminIeltsBand';
import { localizedError } from '../../i18n/errors';
import type { MessageValues } from '../../i18n/translator';
import { adminIeltsBandClient } from '../../lib/api/admin-ielts-band-client';
import { JsonTransfer } from '../admin-authoring/json-transfer';
import '../ielts-bridge/ielts-bridge.css';
import { BandStageEditor } from './band-stage-editor';
import './band-curriculum.css';
import '../admin-content/authoring-experience.css';

type Notice = { key: keyof typeof adminIeltsBandMessages['en']; values?: MessageValues };
type Issue = { path: string; message: string };

export function BandCurriculumWorkspace() {
  const t = useT('adminIeltsBand', adminIeltsBandMessages);
  const { locale } = useLocalePreference();
  const [workspace, setWorkspace] = useState<AdminIeltsBandCurriculumDto | null>(null);
  const [savedSource, setSavedSource] = useState('');
  const [selected, setSelected] = useState(0);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [importDirty, setImportDirty] = useState(false);

  useEffect(() => {
    void adminIeltsBandClient.get().then(data => { setWorkspace(data); setSavedSource(JSON.stringify(data.draft)); }).catch(setError);
  }, []);
  useAdminDraftGuard(importDirty || (workspace !== null && JSON.stringify(workspace.draft) !== savedSource));
  const selectStage = (index: number) => {
    if (!workspace) return;
    setSelected(index);
  };
  const updateStage = (patch: Partial<IeltsBandStage>) => {
    setWorkspace((current) => current ? { ...current, status: 'DRAFT', draft: { ...current.draft, stages: current.draft.stages.map((stage, index) => index === selected ? { ...stage, ...patch } : stage) } } : current);
    setValidatedRevision(null); setMessage(null); setIssues([]);
  };
  const applyImport = (value: unknown) => {
    const content = ieltsBandCurriculumContentSchema.parse(value);
    const changedTopology = content.stages.some((stage, index) => {
      const fixed = INITIAL_IELTS_BAND_CURRICULUM.stages[index]!;
      return stage.code !== fixed.code || stage.order !== fixed.order
        || stage.targetBand.from !== fixed.targetBand.from || stage.targetBand.to !== fixed.targetBand.to
        || JSON.stringify(stage.prerequisiteStageCodes) !== JSON.stringify(fixed.prerequisiteStageCodes);
    });
    if (changedTopology) throw new Error(t('fixedTopologyImport'));
    setWorkspace((current) => current ? { ...current, status: 'DRAFT', draft: content } : current);
    setValidatedRevision(null); setError(null); setIssues([]); setMessage({ key: 'importApplied' });
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null); setIssues([]);
    try { await work(); }
    catch (cause) {
      if (cause instanceof ZodError) setIssues(cause.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
      else setError(cause);
    } finally { setBusy(false); }
  };
  const save = async () => {
    if (!workspace || importDirty) return null;
    const content = ieltsBandCurriculumContentSchema.parse(workspace.draft);
    const saved = await adminIeltsBandClient.save({ expectedRevision: workspace.draftRevision, idempotencyKey: crypto.randomUUID(), content });
    setWorkspace(saved); setSavedSource(JSON.stringify(saved.draft)); setValidatedRevision(null);
    return saved;
  };
  const errorMessage = () => {
    return localizedError(error, locale);
  };
  const validationMessage = (issue: Issue) => {
    if (locale === 'en') return issue.message;
    switch (issue.message) {
      case 'Target band range must increase': return t('increasingRange');
      case 'Competency codes must be unique within a stage': return t('uniqueCompetencies');
      case 'Stage codes must be unique': return t('uniqueStages');
      case 'Stage order must be contiguous': return t('stageOrder');
      case 'Each stage must depend only on the immediately preceding stage': return t('prerequisite');
      case 'Target ranges must be contiguous': return t('contiguousRange');
    }
    const missing = /^Missing (listening|reading|writing|speaking) (competency|remediation)$/u.exec(issue.message);
    if (missing) return t(missing[2] === 'competency' ? 'missingCompetency' : 'missingRemediation', { skill: t(missing[1] as 'listening' | 'reading' | 'writing' | 'speaking') });
    return t('invalidField');
  };

  if (!workspace && !error) return <section className="bridge-shell authoring-experience bridge-state"><p role="status">{t('loading')}</p></section>;
  return <section className="bridge-shell authoring-experience band-config">
    <AdminPageHeader title={t('title')} description={t('description')} actions={<AdminLink href="/admin/content">{t('authorLessons')}</AdminLink>} />
    {error ? <p className="bridge-error" role="alert">{errorMessage()}</p> : null}
    {message ? <p className="bridge-feedback" role="status">{t(message.key, message.values)}</p> : null}
    {workspace ? <>
      <nav className="bridge-stage-nav" aria-label={t('stages')}>
        {workspace.draft.stages.map((stage, index) => <button key={stage.code} type="button" disabled={busy} aria-current={selected === index ? 'page' : undefined} onClick={() => selectStage(index)}><span lang="en">{stage.title}</span></button>)}
      </nav>
      <section className="bridge-stage-card">
        <p className="bridge-kicker">{t('revision', { status: t(workspace.status), revision: workspace.draftRevision })}</p>
        <h2 lang="en">{workspace.draft.stages[selected]?.title}</h2>
        <JsonTransfer content={workspace.draft} schema={ieltsBandCurriculumContentSchema}
          label={t('curriculumJson')} summary={t('transfer')} importLabel={t('applyJson')}
          exportLabel={t('exportJson')} templateLabel={t('templateJson')} template={() => INITIAL_IELTS_BAND_CURRICULUM}
          locale={locale} disabled={busy} onChange={applyImport}
          onDirty={(dirty) => { setImportDirty(dirty); if (dirty) { setValidatedRevision(null); setMessage(null); } }} />
        {importDirty ? <p className="bridge-feedback">{t('unappliedJson')}</p> : null}
        {workspace.draft.stages[selected] ? <BandStageEditor stage={workspace.draft.stages[selected]} onChange={updateStage} disabled={busy || importDirty} /> : null}
        {issues.length > 0 ? <section aria-label={t('validationIssues')} role="alert"><h3>{t('validationIssues')}</h3><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code>: {validationMessage(issue)}</li>)}</ul></section> : null}
        <div className="bridge-actions">
          <button type="button" disabled={busy || importDirty} onClick={() => void run(async () => { if (await save()) setMessage({ key: 'draftSaved' }); })}>{t('saveDraft')}</button>
          <button type="button" disabled={busy || importDirty} onClick={() => void run(async () => {
            const saved = await save(); if (!saved) return;
            const result = await adminIeltsBandClient.validate({ expectedRevision: saved.draftRevision, idempotencyKey: crypto.randomUUID() });
            setValidatedRevision(result.canPublish ? result.draftRevision : null); setIssues(result.issues);
            if (result.canPublish) setMessage({ key: 'ready' });
          })}>{t('saveValidate')}</button>
          <button className="bridge-primary" type="button" disabled={busy || importDirty || validatedRevision !== workspace.draftRevision} onClick={() => void run(async () => {
            const result = await adminIeltsBandClient.publish({ expectedRevision: workspace.draftRevision, idempotencyKey: crypto.randomUUID() });
            setMessage({ key: 'published', values: { version: result.version } });
            setWorkspace(await adminIeltsBandClient.get()); setValidatedRevision(null);
          })}>{t('publishVersion')}</button>
        </div>
      </section>
    </> : null}
  </section>;
}
