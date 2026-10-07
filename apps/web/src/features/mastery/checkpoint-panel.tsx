'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient, type CheckpointAssessmentDto, type ProgressionSummaryDto } from '../../lib/api/api-client';
import { formatDate, formatLevel, percent, SKILLS, skillLabels } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';

const loadProgression = () => apiClient.getProgression();
const statusLabels: Record<CheckpointAssessmentDto['status'], string> = {
  pending_evaluation: 'Evaluation pending', reinforcement_required: 'Reinforcement required',
  passed: 'Checkpoint passed', not_ready: 'Not ready for assessment',
};
function progressionReason(reason: string): string {
  if (reason === 'no_valid_completed_session') return 'Complete a mission session at your current level before assessing.';
  // Preserve learner-facing explanations; do not expose unknown internal reason codes.
  return /^[a-z_]+$/u.test(reason) ? 'Keep practicing at your current level before assessing.' : reason;
}

export function CheckpointPanel({ onLevelChange }: {
  readonly onLevelChange?: (levelCode: string) => void;
}) {
  const resource = useLearnerResource(loadProgression);
  const summary = resource.data ?? resource.previousData;
  const observedLevel = useRef<string | null>(null);
  const currentLevel = resource.data?.currentLevelCode;
  useEffect(() => {
    if (!currentLevel) return;
    if (observedLevel.current !== null && observedLevel.current !== currentLevel) onLevelChange?.(currentLevel);
    observedLevel.current = currentLevel;
  }, [currentLevel, onLevelChange]);
  const updateSummary = (next: ProgressionSummaryDto) => {
    if (observedLevel.current !== null && observedLevel.current !== next.currentLevelCode) onLevelChange?.(next.currentLevelCode);
    observedLevel.current = next.currentLevelCode;
    resource.replaceData(next);
  };
  return <section className="evidence-panel" aria-labelledby="checkpoint-heading" aria-busy={resource.isLoading}>
    <h2 id="checkpoint-heading">Checkpoint assessment</h2>
    <p className="evidence-note">Assess a completed session against the 70% threshold for each skill. Advancement also requires completing your current-level missions and evaluated language practice.</p>
    {resource.isLoading && <p role="status">Loading checkpoint…</p>}
    {resource.failed && <div role="alert"><p>Unable to load checkpoint. Please try again.</p><button type="button" onClick={resource.retry}>Retry checkpoint</button></div>}
    {summary && <CheckpointContent
      key={`${summary.currentLevelCode}:${summary.eligibleSessionId ?? 'none'}`}
      summary={summary} disabled={resource.isLoading || resource.failed}
      onUpdate={updateSummary} onRefresh={resource.retry}
    />}
  </section>;
}

function CheckpointContent({ summary, disabled, onUpdate, onRefresh }: {
  readonly summary: ProgressionSummaryDto;
  readonly disabled: boolean;
  readonly onUpdate: (summary: ProgressionSummaryDto) => void;
  readonly onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<'assess' | 'confirm' | null>(null);
  const [failure, setFailure] = useState<'assess' | 'confirm' | null>(null);
  const pendingAssessmentId = useRef<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const assessment = summary.latestAssessment;
  const canAssess = summary.canAssess && summary.eligibleSessionId !== null;
  const canConfirm = assessment?.status === 'passed' && assessment.canAdvance &&
    assessment.nextLevelCode !== null && assessment.nextLevelCode === summary.nextLevelCode &&
    assessment.levelCode === summary.currentLevelCode;

  const assess = async () => {
    if (!canAssess || !summary.eligibleSessionId || locked.current || disabled) return;
    locked.current = true;
    setBusy('assess');
    setFailure(null);
    const clientAssessmentId = pendingAssessmentId.current ?? crypto.randomUUID();
    pendingAssessmentId.current = clientAssessmentId;
    try {
      const result = await apiClient.assessCheckpoint({ sessionId: summary.eligibleSessionId, clientAssessmentId });
      if (mounted.current) {
        pendingAssessmentId.current = null;
        onUpdate({ ...summary, latestAssessment: result });
      }
    } catch {
      if (mounted.current) setFailure('assess');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  const confirm = async () => {
    if (!canConfirm || !assessment || locked.current || disabled) return;
    locked.current = true;
    setBusy('confirm');
    setFailure(null);
    try {
      const result = await apiClient.confirmCheckpoint(assessment.id);
      if (mounted.current) onUpdate(result);
    } catch {
      if (mounted.current) setFailure('confirm');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  return <div className="checkpoint-content" aria-busy={busy !== null}>
    <p className="checkpoint-level">Current level: {formatLevel(summary.currentLevelCode)}</p>
    {summary.reasons.length > 0 && <ul>{summary.reasons.map((reason) => <li key={reason}>{progressionReason(reason)}</li>)}</ul>}
    {!assessment && <p>No checkpoint assessment yet. Complete a mission session to begin.</p>}
    {assessment && <>
      <div className="checkpoint-result" role="status">
        <h3>{assessment.status === 'passed' && assessment.nextLevelCode === null ? 'Current level complete' : statusLabels[assessment.status]}</h3>
        <p>Assessed <time dateTime={assessment.createdAt}>{formatDate(assessment.createdAt)}</time> · {formatLevel(assessment.levelCode)}</p>
        {assessment.status === 'pending_evaluation' && <p>Some evidence is awaiting evaluation. Pending speaking or writing work has no final score yet. Refresh when evaluated evidence becomes available, then assess again.</p>}
        {assessment.status === 'reinforcement_required' && <p>Continue your current-level missions and practice the skills below before assessing again.</p>}
        {assessment.status === 'not_ready' && <p>Complete the remaining practice at your current level before assessing again.</p>}
        {assessment.status === 'passed' && !canConfirm && assessment.levelCode === summary.currentLevelCode && <p>You have passed this checkpoint. {assessment.nextLevelCode === null ? 'No next level is available yet.' : 'Keep practicing until the next level is available.'}</p>}
      </div>
      <div className="evidence-skill-grid">{SKILLS.map((skill) => {
        const evidence = assessment.skills[skill];
        return <article className="evidence-skill-card" key={skill} aria-label={`${skillLabels[skill]} checkpoint`}>
          <h4>{skillLabels[skill]}</h4>
          <strong className="evidence-score">{evidence.score === null ? 'Pending evaluation' : percent(evidence.score)}</strong>
          {evidence.score !== null && evidence.pendingCount > 0 && <p>Evaluated so far · final score pending</p>}
          <p>Required: {percent(evidence.threshold)}</p>
          <p>{evidence.evaluatedCount} evaluated · {evidence.pendingCount} pending</p>
          <p>{evidence.pendingCount > 0 ? 'Awaiting remaining evidence' : evidence.passed ? 'Threshold met' : 'More practice needed'}</p>
        </article>;
      })}</div>
      {assessment.reinforcement.length > 0 && <section aria-labelledby="reinforcement-heading" className="reinforcement-panel">
        <h3 id="reinforcement-heading">Recommended reinforcement</h3>
        <ul className="evidence-list">{assessment.reinforcement.map((item, index) => <li key={`${item.skill}-${item.reason}-${index}`}>
          <div><h4>{skillLabels[item.skill]}</h4><p>{item.reason === 'below_threshold' ? 'More practice needed' : 'Evaluated evidence needed'}</p><p>{item.action}</p>
            {item.languageBlockIds.length > 0 && <p>{item.languageBlockIds.length} language {item.languageBlockIds.length === 1 ? 'block' : 'blocks'} to practice</p>}
          </div>
        </li>)}</ul>
        <Link href="/dashboard">Practice reinforcement</Link>
      </section>}
      {canConfirm && <div className="advancement-panel">
        <p id="confirm-level-description">You can advance to {formatLevel(assessment.nextLevelCode!)}. Confirm when you are ready.</p>
        <button type="button" aria-describedby="confirm-level-description" disabled={busy !== null || disabled} onClick={() => void confirm()}>{busy === 'confirm' ? 'Confirming…' : 'Confirm next level'}</button>
      </div>}
    </>}
    {failure && <div className="form-error" role="alert">
      <p>{failure === 'assess' ? 'Unable to assess your session. Please try again.' : 'Unable to confirm your next level. Please try again.'}</p>
      <button type="button" disabled={busy !== null || disabled} onClick={() => void (failure === 'assess' ? assess() : confirm())}>{failure === 'assess' ? 'Retry assessment' : 'Retry confirmation'}</button>
    </div>}
    <div className="checkpoint-actions">
      <button type="button" disabled={!canAssess || busy !== null || disabled} onClick={() => void assess()}>{busy === 'assess' ? 'Assessing…' : 'Assess completed session'}</button>
      <button type="button" className="secondary-action-button" disabled={busy !== null || disabled} onClick={onRefresh}>Refresh checkpoint</button>
    </div>
    {assessment && <p className="evidence-note">Assess again after new evaluated practice to create an updated checkpoint result.</p>}
  </div>;
}
