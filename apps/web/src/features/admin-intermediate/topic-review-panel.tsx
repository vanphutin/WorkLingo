'use client';

import { useEffect, useRef, useState } from 'react';
import { defaultTopicPlan, supportedSessionDurations, topicPlanSchema, type SessionDuration, type TopicPlan, type TopicReview } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { ApiError } from '../../lib/api/api-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';
import { AdminLink, useAdminNavigationGuard } from '../admin-dashboard/admin-navigation-guard';

type RecordInfo = { id: string; sourceHash: string; draftRevision: number; status: string };
type Props = { record: RecordInfo; dirty: boolean; onDirtyChange?: ((dirty: boolean) => void) | undefined };
export function TopicReviewPanel({ record, dirty, onDirtyChange }: Props) {
  return <ReviewSession key={`${record.id}:${record.draftRevision}:${record.sourceHash}`} record={record} dirty={dirty} onDirtyChange={onDirtyChange} />;
}
function ReviewSession({ record, dirty, onDirtyChange }: Props) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const [review, setReview] = useState<TopicReview | null>(null);
  const [plan, setPlan] = useState<TopicPlan>(() => defaultTopicPlan(60));
  const [baseline, setBaseline] = useState(() => JSON.stringify(defaultTopicPlan(60)));
  const [error, setError] = useState<'loadError' | 'requestError' | 'conflict' | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const live = useRef(false);
  const inFlight = useRef(false);
  const planDirty = JSON.stringify(plan) !== baseline;
  const readOnly = record.status === 'PUBLISHED' || record.status === 'ARCHIVED';
  const valid = topicPlanSchema.safeParse(plan).success;
  const approved = review?.status === 'approved' && review.approval !== null && !planDirty && !dirty;
  const blocked = busy || readOnly || dirty || error === 'conflict';
  useAdminNavigationGuard(!onDirtyChange && planDirty, t('leave'));
  useEffect(() => { onDirtyChange?.(planDirty); }, [onDirtyChange, planDirty]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  useEffect(() => {
    if (!planDirty || onDirtyChange) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [planDirty, onDirtyChange]);
  useEffect(() => {
    live.current = true;
    let cancelled = false;
    void intermediateTopicClient.review(record.id).then(value => {
      if (cancelled) return;
      accept(value);
    }).catch(() => { if (!cancelled) setError('loadError'); });
    return () => { cancelled = true; live.current = false; };
  }, [record.id, attempt]);
  function accept(value: TopicReview) {
    const next = value.status === 'stale' ? defaultTopicPlan(60) : value.approval?.plan ?? value.proposal?.plan ?? defaultTopicPlan(60);
    setReview(value); setPlan(next); setBaseline(JSON.stringify(next)); setError(null);
  }
  async function act(action: 'propose' | 'approve') {
    if (!review || dirty || readOnly || inFlight.current || error === 'conflict' || (action === 'approve' && !valid)) return;
    if (action === 'propose' && planDirty && !window.confirm(t('leave'))) return;
    inFlight.current = true; setBusy(true); setError(null);
    const command = { expectedDraftRevision: record.draftRevision, expectedSourceHash: record.sourceHash, expectedReviewRevision: review.revision };
    try {
      const value = action === 'propose' ? await intermediateTopicClient.propose(record.id, command)
        : await intermediateTopicClient.approve(record.id, { ...command, plan });
      if (live.current) accept(value);
    } catch (cause) { if (live.current) setError(cause instanceof ApiError && cause.status === 409 ? 'conflict' : 'requestError'); }
    finally { if (live.current) { inFlight.current = false; setBusy(false); } }
  }
  return <section className="intermediate-card" aria-label={t('reviewTitle')}>
    <h2>{t('reviewTitle')}</h2><p className="intermediate-help">{t('approvalHelp')}</p>
    {!review && error ? <p role="alert">{t(error)}</p> : null}
    {!review ? error ? <button type="button" onClick={() => { setError(null); setAttempt(n => n + 1); }}>{t('retry')}</button> : <p role="status">{t('busy')}</p> : <>
      {review.proposal ? <aside><strong>{t('rationale')}</strong><p>{review.proposal.rationale}</p>{review.proposal.simulation ? <p>{t('simulation')}</p> : null}</aside> : null}
      <fieldset disabled={blocked} className="intermediate-form-fields">
        <label className="intermediate-field">{t('duration')}<select value={plan.durationMinutes} onChange={event => setPlan(defaultTopicPlan(Number(event.target.value) as SessionDuration))}>
          {supportedSessionDurations.map(minutes => <option key={minutes} value={minutes}>{t('time', { minutes })}</option>)}
        </select></label>
        <div className="intermediate-grid">{plan.allocations.map((item, index) => <label className="intermediate-field" key={item.type}>
          {t('minutes', { stage: t(item.type) })}<input type="number" min={1} max={150} step={1} value={item.targetMinutes} onChange={event => setPlan(current => ({ ...current, allocations: current.allocations.map((allocation, i) => i === index ? { ...allocation, targetMinutes: Number(event.target.value) } : allocation) }))} />
        </label>)}</div>
      </fieldset>
      <div role="group" aria-label={t('reviewActions')} className="intermediate-review-actions">
        <div className="intermediate-review-feedback" data-approved={approved} role="status" aria-live="polite" aria-atomic="true">
          <strong>{t(busy ? 'busy' : dirty ? 'dirty' : !valid ? 'invalid' : review.status === 'approved' && planDirty ? 'approvalChanges' : review.status)}</strong>
          {approved ? <p>{t(readOnly ? 'approvalRecorded' : 'approvalSaved', { minutes: review.approval!.plan.durationMinutes })}</p> : null}
        </div>
        {error ? <p className="intermediate-notice intermediate-error" role="alert">{t(error)}</p> : null}
        <div className="intermediate-actions">
          <button type="button" disabled={blocked || review.status === 'approved'} onClick={() => void act('propose')}>{t(busy ? 'busy' : 'propose')}</button>
          <button type="button" className="intermediate-save" disabled={blocked || !valid || approved} onClick={() => void act('approve')}>{t(busy ? 'busy' : approved ? 'approvalComplete' : 'approve')}</button>
        </div>
        {approved && !readOnly ? <AdminLink className="intermediate-review-next" href={`/admin/content/${record.id}`}>{t('continuePublication')}</AdminLink> : null}
      </div>
    </>}
  </section>;
}
