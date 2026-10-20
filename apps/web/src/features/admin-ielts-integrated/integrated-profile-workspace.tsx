'use client';

import type { AdminIeltsIntegratedProfileDto } from '@worklingo/contracts';
import { useEffect, useState } from 'react';
import { useT, useLocalePreference } from '../../i18n/provider';
import { adminIeltsIntegratedMessages } from '../../i18n/messages/adminIeltsIntegrated';
import { localizedError } from '../../i18n/errors';
import type { MessageValues } from '../../i18n/translator';
import { adminIeltsIntegratedClient } from '../../lib/api/admin-ielts-integrated-client';
import '../ielts-bridge/ielts-bridge.css';
import '../admin-content/authoring-experience.css';

type Notice = { key: keyof typeof adminIeltsIntegratedMessages['en']; values?: MessageValues };
type Issue = { path: string; message: string };

export function IntegratedProfileWorkspace() {
  const t = useT('adminIeltsIntegrated', adminIeltsIntegratedMessages);
  const { locale } = useLocalePreference();
  const [profiles, setProfiles] = useState<AdminIeltsIntegratedProfileDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(null);
  const [message, setMessage] = useState<Notice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const values = await adminIeltsIntegratedClient.list();
    setProfiles(values);
    setSelectedId((current) => current ?? values[0]?.id ?? null);
  };
  useEffect(() => { void load().catch(setError).finally(() => setLoading(false)); }, []);
  const selected = profiles.find((profile) => profile.id === selectedId);
  const replace = (next: AdminIeltsIntegratedProfileDto) => setProfiles((current) => current.map((profile) => profile.id === next.id ? next : profile));
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await work(); } catch (cause) { setError(cause); } finally { setBusy(false); }
  };
  const updateMinutes = (skill: string, targetMinutes: number) => {
    if (!selected) return;
    replace({ ...selected, status: 'DRAFT', draft: { ...selected.draft, allocations: selected.draft.allocations.map((allocation) => allocation.skill === skill ? { ...allocation, targetMinutes } : allocation) } });
    setValidatedRevision(null);
  };
  const validationMessage = (issue: Issue) => {
    if (locale === 'en') return issue.message;
    if (issue.message === 'Allocations must contain each skill exactly once') return t('allocationSkills');
    if (issue.message === 'Allocation minutes must equal session duration') return t('allocationTotal');
    return t('invalidField');
  };

  return <main className="bridge-shell authoring-experience">
    <header className="bridge-heading"><div><p className="bridge-kicker">{t('curriculum')}</p><h1>{t('title')}</h1><p>{t('description')}</p></div></header>
    {error ? <p className="bridge-error" role="alert">{localizedError(error, locale)}</p> : null}
    {message ? <p className="bridge-feedback" role="status">{t(message.key, message.values)}</p> : null}
    <div className="bridge-stage-nav" aria-label={t('profiles')}>
      {profiles.map((profile) => <button key={profile.id} type="button" aria-current={profile.id === selectedId ? 'page' : undefined} onClick={() => { setSelectedId(profile.id); setValidatedRevision(null); setIssues([]); }}>{t('minutes', { count: profile.durationMinutes })}</button>)}
    </div>
    {selected ? <section className="bridge-stage-card">
      <p className="bridge-kicker">{t('revision', { status: t(selected.status), revision: selected.draftRevision })}</p>
      <h2>{t('allocation', { count: selected.durationMinutes })}</h2>
      {selected.draft.allocations.map((allocation) => <label key={allocation.skill}>{t(allocation.skill)}<input type="number" min="1" max={selected.durationMinutes} value={allocation.targetMinutes} onChange={(event) => updateMinutes(allocation.skill, Number(event.target.value))} /></label>)}
      <p><strong>{t('total')}</strong> {t('totalMinutes', { total: selected.draft.allocations.reduce((sum, allocation) => sum + allocation.targetMinutes, 0), duration: selected.durationMinutes })}</p>
      {issues.length > 0 ? <section aria-label={t('validationIssues')}><h3>{t('validationIssues')}</h3><ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> {validationMessage(issue)}</li>)}</ul></section> : null}
      <div className="bridge-actions">
        <button type="button" disabled={busy} onClick={() => void run(async () => {
          replace(await adminIeltsIntegratedClient.update(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID(), content: selected.draft }));
          setMessage({ key: 'draftSaved' });
        })}>{t('saveDraft')}</button>
        <button type="button" disabled={busy} onClick={() => void run(async () => {
          const saved = await adminIeltsIntegratedClient.update(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID(), content: selected.draft });
          replace(saved);
          const result = await adminIeltsIntegratedClient.validate(saved.id, { expectedRevision: saved.draftRevision, idempotencyKey: crypto.randomUUID() });
          setValidatedRevision(result.canPublish ? result.draftRevision : null); setIssues(result.issues);
          if (result.canPublish) setMessage({ key: 'ready' });
        })}>{t('saveValidate')}</button>
        <button className="bridge-primary" type="button" disabled={busy || validatedRevision !== selected.draftRevision} onClick={() => void run(async () => {
          const result = await adminIeltsIntegratedClient.publish(selected.id, { expectedRevision: selected.draftRevision, idempotencyKey: crypto.randomUUID() });
          setMessage({ key: 'published', values: { version: result.version } }); await load();
        })}>{t('publishVersion')}</button>
      </div>
    </section> : <p role="status">{t(loading ? 'loading' : 'empty')}</p>}
  </main>;
}
