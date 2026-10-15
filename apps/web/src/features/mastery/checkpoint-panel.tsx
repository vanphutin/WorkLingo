'use client';

import { useT, useLocalePreference } from '../../i18n/provider';
import { masteryMessages } from '../../i18n/messages/mastery';
import { localizedError } from '../../i18n/errors';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiClient, type CheckpointAssessmentDto, type ProgressionSummaryDto } from '../../lib/api/api-client';
import { formatDate, formatLevel, percent, SKILLS } from './evidence-format';
import { useLearnerResource } from './use-learner-resource';
import { systemExplanation } from './evidence-format';
import type { Translator } from '../../i18n/translator';
import type { UiLocale } from '../../i18n/locale';

const loadProgression = () => apiClient.getProgression();
const statusKeys = {
  pending_evaluation: 'evaluationPending', reinforcement_required: 'reinforcementRequired',
  passed: 'checkpointPassed', not_ready: 'notReady',
} as const satisfies Record<CheckpointAssessmentDto['status'], keyof typeof masteryMessages.en>;
function progressionReason(reason: string, t: Translator<typeof masteryMessages>, locale: UiLocale): string {
  if (reason === 'no_valid_completed_session') return t('noValidSession');
  if (reason === 'incomplete_missions') return t('incompleteMissions');
  if (reason === 'curriculum_unavailable') return t('curriculumUnavailable');
  return /^[a-z_]+$/u.test(reason) ? t('keepPracticing') : systemExplanation(reason, locale);
};

export function CheckpointPanel({ onLevelChange }: {
  readonly onLevelChange?: (levelCode: string) => void;
}) {
  const t = useT('mastery', masteryMessages);
  const { locale } = useLocalePreference();
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
    <h2 id="checkpoint-heading">{t('checkpoint')}</h2>
    <p className="evidence-note">{t('checkpointNote')}</p>
    {resource.isLoading && <p role="status">{t('loadingCheckpoint')}</p>}
    {resource.failed && <div role="alert"><p>{t('checkpointError')}</p><p>{localizedError(resource.error, locale)}</p><button type="button" onClick={resource.retry}>{t('retryCheckpoint')}</button></div>}
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
  const t = useT('mastery', masteryMessages);
  const { locale } = useLocalePreference();
  const [busy, setBusy] = useState<'assess' | 'confirm' | null>(null);
  const [failure, setFailure] = useState<'assess' | 'confirm' | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
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
    } catch (error) {
      if (mounted.current) { setFailure('assess'); setActionError(error); }
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
    } catch (error) {
      if (mounted.current) { setFailure('confirm'); setActionError(error); }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(null);
    }
  };

  return <div className="checkpoint-content" aria-busy={busy !== null}>
    <p className="checkpoint-level">{t('currentLevel', { level: formatLevel(summary.currentLevelCode, locale) })}</p>
    {summary.reasons.length > 0 && <ul>{summary.reasons.map((reason) => <li key={reason}>{progressionReason(reason, t, locale)}</li>)}</ul>}
    {!assessment && <p>{t('noCheckpoint')}</p>}
    {assessment && <>
      <div className="checkpoint-result" role="status">
        <h3>{assessment.status === 'passed' && assessment.nextLevelCode === null ? t('currentComplete') : t(statusKeys[assessment.status])}</h3>
        <p>{t('assessed')}{' '}<time dateTime={assessment.createdAt}>{formatDate(assessment.createdAt, locale)}</time> · {formatLevel(assessment.levelCode, locale)}</p>
        {assessment.status === 'pending_evaluation' && <p>{t('pendingNote')}</p>}
        {assessment.status === 'reinforcement_required' && <p>{t('reinforcementNote')}</p>}
        {assessment.status === 'not_ready' && <p>{t('notReadyNote')}</p>}
        {assessment.status === 'passed' && !canConfirm && assessment.levelCode === summary.currentLevelCode && <p>{t('passedNote')}{' '}{assessment.nextLevelCode === null ? t('noNextLevel') : t('waitNextLevel')}</p>}
      </div>
      <div className="evidence-skill-grid">{SKILLS.map((skill) => {
        const evidence = assessment.skills[skill];
        return <article className="evidence-skill-card" key={skill} aria-label={t('checkpointAria', { skill: t(skill) })}>
          <h4>{t(skill)}</h4>
          <strong className="evidence-score">{evidence.score === null ? t('pendingEvaluation') : percent(evidence.score, locale)}</strong>
          {evidence.score !== null && evidence.pendingCount > 0 && <p>{t('provisional')}</p>}
          <p>{t('required')}{' '}{percent(evidence.threshold, locale)}</p>
          <p>{t('evidenceCounts', { evaluated: evidence.evaluatedCount, pending: evidence.pendingCount })}</p>
          <p>{evidence.pendingCount > 0 ? t('awaitingEvidence') : evidence.passed ? t('thresholdMet') : t('morePractice')}</p>
        </article>;
      })}</div>
      {assessment.reinforcement.length > 0 && <section aria-labelledby="reinforcement-heading" className="reinforcement-panel">
        <h3 id="reinforcement-heading">{t('reinforcement')}</h3>
        <ul className="evidence-list">{assessment.reinforcement.map((item, index) => <li key={`${item.skill}-${item.reason}-${index}`}>
          <div><h4>{t(item.skill)}</h4><p>{item.reason === 'below_threshold' ? t('morePractice') : t('evaluatedEvidence')}</p><p>{systemExplanation(item.action, locale)}</p>
            {item.languageBlockIds.length > 0 && <p>{t('practiceBlocks', { count: item.languageBlockIds.length })}</p>}
          </div>
        </li>)}</ul>
        <Link href="/dashboard">{t('practiceReinforcement')}</Link>
      </section>}
      {canConfirm && <div className="advancement-panel">
        <p id="confirm-level-description">{t('advance', { level: formatLevel(assessment.nextLevelCode!, locale) })}</p>
        <button type="button" aria-describedby="confirm-level-description" disabled={busy !== null || disabled} onClick={() => void confirm()}>{busy === 'confirm' ? t('confirming') : t('confirmNext')}</button>
      </div>}
    </>}
    {failure && <div className="form-error" role="alert">
      <p>{failure === 'assess' ? t('assessError') : t('confirmError')}</p>
      <p>{localizedError(actionError, locale)}</p>
      <button type="button" disabled={busy !== null || disabled} onClick={() => void (failure === 'assess' ? assess() : confirm())}>{failure === 'assess' ? t('retryAssessment') : t('retryConfirmation')}</button>
    </div>}
    <div className="checkpoint-actions">
      <button type="button" disabled={!canAssess || busy !== null || disabled} onClick={() => void assess()}>{busy === 'assess' ? t('assessing') : t('assess')}</button>
      <button type="button" className="secondary-action-button" disabled={busy !== null || disabled} onClick={onRefresh}>{t('refresh')}</button>
    </div>
    {assessment && <p className="evidence-note">{t('reassessNote')}</p>}
  </div>;
}
