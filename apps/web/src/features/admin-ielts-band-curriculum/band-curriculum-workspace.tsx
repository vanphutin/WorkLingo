'use client';

import { ieltsBandStageSchema, type AdminIeltsBandCurriculumDto, type IeltsBandStage } from '@worklingo/contracts';
import { useEffect, useState } from 'react';
import { ZodError } from 'zod';
import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsBandMessages } from '../../i18n/messages/adminIeltsBand';
import { localizedError } from '../../i18n/errors';
import type { MessageValues } from '../../i18n/translator';
import { adminIeltsBandClient } from '../../lib/api/admin-ielts-band-client';
import '../ielts-bridge/ielts-bridge.css';

type Notice = { key: keyof typeof adminIeltsBandMessages['en']; values?: MessageValues };
type Issue = { path: string; message: string };

export function BandCurriculumWorkspace() {
  const t = useT('adminIeltsBand', adminIeltsBandMessages);
  const { locale } = useLocalePreference();
  const [workspace, setWorkspace] = useState<AdminIeltsBandCurriculumDto | null>(null);
  const [selected, setSelected] = useState(0);
  const [source, setSource] = useState('');
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    void adminIeltsBandClient.get().then((value) => { setWorkspace(value); setSource(JSON.stringify(value.draft.stages[0], null, 2)); }).catch(setError);
  }, []);
  const selectStage = (index: number) => {
    if (!workspace) return;
    setSelected(index); setSource(JSON.stringify(workspace.draft.stages[index], null, 2)); setError(null); setIssues([]);
  };
  const contentFromSource = () => {
    if (!workspace) throw new Error('Curriculum is not loaded.');
    let parsed: unknown;
    try { parsed = JSON.parse(source); } catch { throw new Error('Stage definition must be valid JSON.'); }
    const stage = ieltsBandStageSchema.parse(parsed);
    return { ...workspace.draft, stages: workspace.draft.stages.map((item, index) => index === selected ? stage : item) as IeltsBandStage[] };
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
    if (!workspace) return null;
    const saved = await adminIeltsBandClient.save({ expectedRevision: workspace.draftRevision, idempotencyKey: crypto.randomUUID(), content: contentFromSource() });
    setWorkspace(saved); setSource(JSON.stringify(saved.draft.stages[selected], null, 2)); setValidatedRevision(null);
    return saved;
  };
  const errorMessage = () => {
    if (error instanceof Error && error.message === 'Stage definition must be valid JSON.') return t('invalidJson');
    if (error instanceof Error && error.message === 'Curriculum is not loaded.') return t('notLoaded');
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

  if (!workspace && !error) return <main className="bridge-shell bridge-state"><p role="status">{t('loading')}</p></main>;
  return <main className="bridge-shell">
    <header className="bridge-heading"><div><p className="bridge-kicker">{t('admin')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div></header>
    {error ? <p className="bridge-error" role="alert">{errorMessage()}</p> : null}
    {message ? <p className="bridge-feedback" role="status">{t(message.key, message.values)}</p> : null}
    {workspace ? <>
      <nav className="bridge-stage-nav" aria-label={t('stages')}>
        {workspace.draft.stages.map((stage, index) => <button key={stage.code} type="button" aria-current={selected === index ? 'page' : undefined} onClick={() => selectStage(index)}><span lang="en">{stage.title}</span></button>)}
      </nav>
      <section className="bridge-stage-card">
        <p className="bridge-kicker">{t('revision', { status: t(workspace.status), revision: workspace.draftRevision })}</p>
        <h2 lang="en">{workspace.draft.stages[selected]?.title}</h2>
        <label className="bridge-response"><span>{t('source')}</span><textarea lang="en" rows={24} value={source} onChange={(event) => { setSource(event.target.value); setValidatedRevision(null); }} spellCheck={false} /></label>
        {issues.length > 0 ? <section aria-label={t('validationIssues')} role="alert"><h3>{t('validationIssues')}</h3><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code>: {validationMessage(issue)}</li>)}</ul></section> : null}
        <div className="bridge-actions">
          <button type="button" disabled={busy} onClick={() => void run(async () => { if (await save()) setMessage({ key: 'draftSaved' }); })}>{t('saveDraft')}</button>
          <button type="button" disabled={busy} onClick={() => void run(async () => {
            const saved = await save(); if (!saved) return;
            const result = await adminIeltsBandClient.validate({ expectedRevision: saved.draftRevision, idempotencyKey: crypto.randomUUID() });
            setValidatedRevision(result.canPublish ? result.draftRevision : null); setIssues(result.issues);
            if (result.canPublish) setMessage({ key: 'ready' });
          })}>{t('saveValidate')}</button>
          <button className="bridge-primary" type="button" disabled={busy || validatedRevision !== workspace.draftRevision} onClick={() => void run(async () => {
            const result = await adminIeltsBandClient.publish({ expectedRevision: workspace.draftRevision, idempotencyKey: crypto.randomUUID() });
            setMessage({ key: 'published', values: { version: result.version } });
            setWorkspace(await adminIeltsBandClient.get()); setValidatedRevision(null);
          })}>{t('publishVersion')}</button>
        </div>
      </section>
    </> : null}
  </main>;
}
