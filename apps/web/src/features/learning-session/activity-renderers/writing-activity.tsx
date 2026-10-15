'use client';

import { useT, useLocalePreference } from '../../../i18n/provider';
import { localizedError } from '../../../i18n/errors';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import React, { useEffect, useRef, useState } from 'react';

import { ApiError, apiClient, type LearnerActivityDto } from '../../../lib/api/api-client';

interface WritingActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly sessionId: string;
  readonly autosaveDelayMs?: number;
}

export function WritingActivity({
  activity,
  value,
  onChange,
  disabled = false,
  sessionId,
  autosaveDelayMs = 600,
}: WritingActivityProps) {
  const t = useT('learningSession', learningSessionMessages);
  const { locale } = useLocalePreference();
  const prompt = (activity.payload.prompt as string) || t('writingFallback');
  const minWords = typeof activity.payload.minWords === 'number' ? activity.payload.minWords : 1;
  const requiredPhrases = Array.isArray(activity.payload.requiredPhrases)
    ? activity.payload.requiredPhrases.filter((phrase): phrase is string => typeof phrase === 'string')
    : [];
  const requiresVocabularyRecall = activity.foundationCategory === 'vocabulary';
  const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
  const revisionRef = useRef(0);
  const editVersionRef = useRef(0);
  const scopeRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [draftError, setDraftError] = useState<{ cause: unknown } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const scope = ++scopeRef.current;
    editVersionRef.current = 0;
    revisionRef.current = 0;
    saveChainRef.current = Promise.resolve();
    setDraftError(null);
    let active = true;
    void apiClient.getActivityDraft(sessionId, activity.id).then((draft) => {
      if (!active || scope !== scopeRef.current) return;
      revisionRef.current = draft?.revision ?? 0;
      if (editVersionRef.current === 0 && draft?.text && draft.text !== value) onChange(draft.text);
      setDraftStatus('saved');
    }).catch((cause: unknown) => {
      if (active) {
        setDraftError({ cause });
        setDraftStatus('error');
      }
    });
    return () => {
      active = false;
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activity.id, sessionId]);

  const saveDraft = async (text: string, editVersion: number, scope: number): Promise<void> => {
    if (scope !== scopeRef.current) return;
    setDraftStatus('saving');
    setDraftError(null);
    try {
      const saved = await apiClient.saveActivityDraft(sessionId, activity.id, {
        expectedRevision: revisionRef.current,
        text,
      });
      if (scope !== scopeRef.current) return;
      revisionRef.current = saved.revision;
      if (mountedRef.current && editVersion === editVersionRef.current) setDraftStatus('saved');
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'DRAFT_REVISION_CONFLICT') {
        const newest = await apiClient.getActivityDraft(sessionId, activity.id);
        if (newest && mountedRef.current && scope === scopeRef.current) {
          revisionRef.current = newest.revision;
          if (editVersion === editVersionRef.current) {
            onChange(newest.text);
            setDraftStatus('saved');
          }
          return;
        }
      }
      if (mountedRef.current && scope === scopeRef.current && editVersion === editVersionRef.current) {
        setDraftError({ cause: caught });
        setDraftStatus('error');
      }
    }
  };

  const handleChange = (next: string): void => {
    const editVersion = ++editVersionRef.current;
    const scope = scopeRef.current;
    onChange(next);
    setDraftStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveChainRef.current = saveChainRef.current.then(
        () => saveDraft(next, editVersion, scope),
        () => saveDraft(next, editVersion, scope),
      );
    }, autosaveDelayMs);
  };

  return (
    <article className="activity-container writing-activity" aria-labelledby="writing-prompt">
      <div className="activity-header">
        <h2 id="writing-prompt" className="activity-prompt" lang={activity.payload.prompt ? "en" : undefined}>
          {prompt}
        </h2>
      </div>

      <section className="writing-rubric-box" aria-label={t('writingGuidelines')}>
          <h3 className="section-subtitle">{t('writingGoals')}</h3>
          <p className="rubric-text">{t('writingMinimum', { count: minWords })}</p>
          {requiredPhrases.length > 0 && requiresVocabularyRecall ? (
            <p className="rubric-text">
              {t('writingRecall', { count: requiredPhrases.length })}
            </p>
          ) : null}
          {requiredPhrases.length > 0 && !requiresVocabularyRecall ? (
            <ul className="writing-required-phrases">
              {requiredPhrases.map((phrase) => <li key={phrase} lang="en">{phrase}</li>)}
            </ul>
          ) : null}
        </section>

      <div className="writing-input-group">
        <label htmlFor="written-response-textarea" className="writing-label">
          {t('writtenResponse')}
        </label>
        <textarea
          id="written-response-textarea"
          lang="en"
          className="writing-textarea"
          rows={6}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('writingPlaceholder')}
          disabled={disabled}
          aria-describedby="writing-help writing-status"
        />
        <div className="writing-editor-meta">
          <p id="writing-help" className="input-help-text">{t('wordCount', { count: wordCount, minimum: minWords })}</p>
          <p id="writing-status" className={`draft-status draft-${draftStatus}`} role="status" aria-live="polite">
            {draftStatus === 'loading' ? t('draftLoading')
              : draftStatus === 'saving' ? t('draftSaving')
                : draftStatus === 'saved' ? t('draftSaved')
                  : draftError ? localizedError(draftError.cause, locale) : t('draftError')}
          </p>
        </div>
      </div>
    </article>
  );
}
