'use client';

import { useT, useLocalePreference } from '../../../i18n/provider';
import { localizedError } from '../../../i18n/errors';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import React, { useRef, useState } from 'react';
import {
  RECORDING_CONSENT_POLICY_VERSION,
  RECORDING_CONSENT_SCOPE,
} from '@worklingo/contracts';

import type {
  LearnerActivityDto,
  RecordingSubmissionResult,
  SubmitRecordingInput,
} from '../../../lib/api/api-client';
import { useAudioRecorder } from '../use-audio-recorder';
import { PronunciationFocusPanel } from './pronunciation-focus-panel';

interface SpeakingActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly sessionId: string;
  readonly onSubmitRecording: (input: SubmitRecordingInput) => Promise<RecordingSubmissionResult>;
}

export function SpeakingActivity({
  activity,
  value,
  onChange,
  disabled = false,
  sessionId,
  onSubmitRecording,
}: SpeakingActivityProps) {
  const t = useT('learningSession', learningSessionMessages);
  const { locale } = useLocalePreference();
  const prompt = (activity.payload.prompt as string) || t('speakingFallback');
  const recorder = useAudioRecorder();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{ cause: unknown } | null>(null);
  const clientAttemptIdRef = useRef<string | null>(null);

  const submitRecording = async (): Promise<void> => {
    if (!recorder.blob || !consentAccepted || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await onSubmitRecording({
        activityId: activity.id,
        audio: recorder.blob,
        clientAttemptId: clientAttemptIdRef.current ??= crypto.randomUUID(),
        consentAccepted: true,
        consentPolicyVersion: RECORDING_CONSENT_POLICY_VERSION,
        consentScope: RECORDING_CONSENT_SCOPE,
        sessionId,
      });
    } catch (caught) {
      setUploadError({ cause: caught });
    } finally {
      setIsUploading(false);
    }
  };

  const rerecord = async (): Promise<void> => {
    recorder.discard();
    clientAttemptIdRef.current = crypto.randomUUID();
    setConsentAccepted(false);
    await recorder.start();
  };

  const startRecording = async (): Promise<void> => {
    clientAttemptIdRef.current = crypto.randomUUID();
    setConsentAccepted(false);
    await recorder.start();
  };

  const discardRecording = (): void => {
    recorder.discard();
    clientAttemptIdRef.current = null;
    setConsentAccepted(false);
    setUploadError(null);
  };

  return (
    <article className="activity-container speaking-activity" aria-labelledby="speaking-prompt">
      <div className="activity-header">
        <h2 id="speaking-prompt" className="activity-prompt" lang={activity.payload.prompt ? "en" : undefined}>
          {prompt}
        </h2>
      </div>

      <PronunciationFocusPanel activity={activity} sessionId={sessionId} />

      {recorder.supported ? (
        <section className="speaking-recorder" aria-label={t('speakingRecorder')} aria-busy={isUploading}>
          <p className="recorder-status" role="status" aria-live="polite">
            {recorder.status === 'requesting' ? t('microphoneWaiting')
              : recorder.status === 'recording' ? t('recordingInProgress')
                : recorder.status === 'preview' ? t('recordingReady')
                  : t('microphoneIdle')}
          </p>
          {recorder.status === 'idle' || recorder.status === 'error' ? (
            <button type="button" className="primary-action-button" onClick={() => void startRecording()} disabled={disabled}>
              {t('recordResponse')}
            </button>
          ) : null}
          {recorder.status === 'recording' ? (
            <button type="button" className="recording-stop-button" onClick={recorder.stop}>{t('stopRecording')}</button>
          ) : null}
          {recorder.previewUrl ? (
            <div className="recording-preview">
              <audio aria-label={t('recordingPreview')} controls preload="metadata" src={recorder.previewUrl} />
              <div className="recording-actions">
                <button type="button" className="secondary-action-button" onClick={() => void rerecord()} disabled={isUploading}>{t('rerecord')}</button>
                <button type="button" className="secondary-action-button" onClick={discardRecording} disabled={isUploading}>{t('discard')}</button>
              </div>
              <p className="recording-consent-details">
                {t('recordingConsentDetails')}
              </p>
              <label className="recording-consent">
                <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
                {t('recordingConsent', { version: RECORDING_CONSENT_POLICY_VERSION })}
              </label>
              <button type="button" className="continue-button" onClick={() => void submitRecording()}
                disabled={!consentAccepted || isUploading || disabled}>
                {isUploading ? t('uploadingRecording') : t('sendEvaluation')}
              </button>
            </div>
          ) : null}
          {recorder.error ? <p className="feedback-error" role="alert">{recorder.error}</p> : null}
          {uploadError ? <p className="feedback-error" role="alert">{localizedError(uploadError.cause, locale)}</p> : null}
        </section>
      ) : (
      <div className="speaking-input-group">
        <p className="speaking-fallback-notice">{t('recordingUnavailable')}</p>
        <label htmlFor="spoken-response-input" className="speaking-label">
          {t('spokenResponse')}
        </label>
        <textarea
          id="spoken-response-input"
          lang="en"
          className="speaking-textarea"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('speakingPlaceholder')}
          disabled={disabled}
          aria-describedby="speaking-help"
        />
        <p id="speaking-help" className="input-help-text">
          {t('speakingHelp')}
        </p>
      </div>
      )}
    </article>
  );
}
