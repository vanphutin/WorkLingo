'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { canAttemptTopicJsonRepair, isSafeTopicJsonRepair, type TopicJsonRepairProposal } from '@worklingo/contracts';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { ApiError } from '../../lib/api/api-client';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { AdminLink } from '../admin-dashboard/admin-navigation-guard';

export function TopicJsonRepair({ source, disabled, onApply, onBusyChange }: {
  source: string; disabled: boolean; onApply: (source: string) => boolean; onBusyChange: (busy: boolean) => void;
}) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ source: string; key: 'repairUnsafe' | 'repairUnavailable' } | null>(null);
  const [proposal, setProposal] = useState<(TopicJsonRepairProposal & { original: string }) | null>(null);
  const live = useRef(false);
  const currentSource = useRef(source); currentSource.current = source;
  const locked = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; onBusyChange(false); }; }, [onBusyChange]);
  const eligible = canAttemptTopicJsonRepair(source);
  async function request() {
    if (!eligible || disabled || locked.current) return;
    locked.current = true; setBusy(true); onBusyChange(true); setError(null); setProposal(null);
    const original = source;
    try {
      const value = await intermediateTopicClient.repairJson({ source: original });
      if (!live.current || currentSource.current !== original) return;
      if (!isSafeTopicJsonRepair(original, value.source)) { setError({ source: original, key: 'repairUnsafe' }); return; }
      setProposal({ ...value, original });
    } catch (cause) {
      if (live.current && currentSource.current === original) setError({ source: original, key: cause instanceof ApiError && cause.status === 422 ? 'repairUnsafe' : 'repairUnavailable' });
    } finally { if (live.current) { locked.current = false; setBusy(false); onBusyChange(false); } }
  }
  const current = proposal?.original === source ? proposal : null;
  return <section className="intermediate-json-repair" aria-label={t('repairTitle')}>
    <p className="intermediate-help">{t('repairHelp')}</p>
    {!eligible ? <p className="intermediate-help">{t('repairIneligible')}</p> : null}
    <button type="button" disabled={disabled || busy || !eligible} onClick={() => void request()}>{t(busy ? 'busy' : 'repairTitle')}</button>
    {error?.source === source ? <p role="alert">{t(error.key)} {error.key === 'repairUnavailable' ? <AdminLink href="/admin/settings/ai">{t('repairSettings')}</AdminLink> : null}</p> : null}
    {current ? <div>
      <p>{current.explanation}</p>
      <div className="intermediate-field"><label htmlFor={id}>{t('repairCandidate')}</label><textarea id={id} rows={10} readOnly value={current.source} /></div>
      <p className="intermediate-help">{t('repairVerified')}</p>
      <div className="intermediate-actions">
        <button type="button" disabled={disabled || busy} onClick={() => { if (onApply(current.source)) setProposal(null); }}>{t('repairApply')}</button>
        <button type="button" disabled={busy} onClick={() => setProposal(null)}>{t('repairDismiss')}</button>
      </div>
    </div> : null}
  </section>;
}
