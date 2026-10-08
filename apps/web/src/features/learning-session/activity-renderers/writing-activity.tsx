'use client';

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
  const prompt = (activity.payload.prompt as string) || 'Write your response below.';
  const minWords = typeof activity.payload.minWords === 'number' ? activity.payload.minWords : 1;
  const requiredPhrases = Array.isArray(activity.payload.requiredPhrases)
    ? activity.payload.requiredPhrases.filter((phrase): phrase is string => typeof phrase === 'string')
    : [];
  const wordCount = value.trim() ? value.trim().split(/\s+/u).length : 0;
  const revisionRef = useRef(0);
  const editVersionRef = useRef(0);
  const scopeRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const [draftStatus, setDraftStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');

  useEffect(() => {
    mountedRef.current = true;
    const scope = ++scopeRef.current;
    editVersionRef.current = 0;
    revisionRef.current = 0;
    saveChainRef.current = Promise.resolve();
    let active = true;
    void apiClient.getActivityDraft(sessionId, activity.id).then((draft) => {
      if (!active || scope !== scopeRef.current) return;
      revisionRef.current = draft?.revision ?? 0;
      if (editVersionRef.current === 0 && draft?.text && draft.text !== value) onChange(draft.text);
      setDraftStatus('saved');
    }).catch(() => {
      if (active) setDraftStatus('error');
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
        <h2 id="writing-prompt" className="activity-prompt">
          {prompt}
        </h2>
      </div>

      <section className="writing-rubric-box" aria-label="Writing guidelines">
          <h3 className="section-subtitle">Mục tiêu bài viết</h3>
          <p className="rubric-text">Viết ít nhất {minWords} từ và dùng ngôn ngữ phù hợp với công việc.</p>
          {requiredPhrases.length > 0 ? (
            <ul className="writing-required-phrases">
              {requiredPhrases.map((phrase) => <li key={phrase}>{phrase}</li>)}
            </ul>
          ) : null}
        </section>

      <div className="writing-input-group">
        <label htmlFor="written-response-textarea" className="writing-label">
          Your written response:
        </label>
        <textarea
          id="written-response-textarea"
          className="writing-textarea"
          rows={6}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Compose your workplace message here…"
          disabled={disabled}
          aria-describedby="writing-help writing-status"
        />
        <div className="writing-editor-meta">
          <p id="writing-help" className="input-help-text">{wordCount}/{minWords} từ</p>
          <p id="writing-status" className={`draft-status draft-${draftStatus}`} role="status" aria-live="polite">
            {draftStatus === 'loading' ? 'Đang tải bản nháp…'
              : draftStatus === 'saving' ? 'Đang lưu…'
                : draftStatus === 'saved' ? 'Đã lưu bản nháp'
                  : 'Chưa thể lưu bản nháp'}
          </p>
        </div>
      </div>
    </article>
  );
}
