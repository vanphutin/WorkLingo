'use client';

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
  const prompt = (activity.payload.prompt as string) || 'Respond verbally to the prompt.';
  const recorder = useAudioRecorder();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
      setUploadError(caught instanceof Error ? caught.message : 'Recording upload failed.');
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
        <h2 id="speaking-prompt" className="activity-prompt">
          {prompt}
        </h2>
      </div>

      {recorder.supported ? (
        <section className="speaking-recorder" aria-label="Speaking recorder" aria-busy={isUploading}>
          <p className="recorder-status" role="status" aria-live="polite">
            {recorder.status === 'requesting' ? 'Waiting for microphone permission…'
              : recorder.status === 'recording' ? 'Recording in progress…'
                : recorder.status === 'preview' ? 'Recording ready to review.'
                  : 'Your microphone starts only when you choose Record.'}
          </p>
          {recorder.status === 'idle' || recorder.status === 'error' ? (
            <button type="button" className="primary-action-button" onClick={() => void startRecording()} disabled={disabled}>
              Record response
            </button>
          ) : null}
          {recorder.status === 'recording' ? (
            <button type="button" className="recording-stop-button" onClick={recorder.stop}>Stop recording</button>
          ) : null}
          {recorder.previewUrl ? (
            <div className="recording-preview">
              <audio aria-label="Recording preview" controls preload="metadata" src={recorder.previewUrl} />
              <div className="recording-actions">
                <button type="button" className="secondary-action-button" onClick={() => void rerecord()} disabled={isUploading}>Re-record</button>
                <button type="button" className="secondary-action-button" onClick={discardRecording} disabled={isUploading}>Discard</button>
              </div>
              <p className="recording-consent-details">
                Your audio is stored locally for Teacher AI evaluation. If configured, it may be
                sent to an external speech provider. Audio is kept for up to seven days after
                processing and can be deleted early; your transcript and feedback remain. A
                provider request already in flight cannot be recalled.
              </p>
              <label className="recording-consent">
                <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
                I consent to this use under policy {RECORDING_CONSENT_POLICY_VERSION}.
              </label>
              <button type="button" className="continue-button" onClick={() => void submitRecording()}
                disabled={!consentAccepted || isUploading || disabled}>
                {isUploading ? 'Uploading recording…' : 'Send for evaluation'}
              </button>
            </div>
          ) : null}
          {recorder.error ? <p className="feedback-error" role="alert">{recorder.error}</p> : null}
          {uploadError ? <p className="feedback-error" role="alert">{uploadError}</p> : null}
        </section>
      ) : (
      <div className="speaking-input-group">
        <p className="speaking-fallback-notice">Audio recording is unavailable in this browser. This typed practice is unscored.</p>
        <label htmlFor="spoken-response-input" className="speaking-label">
          Your spoken response (unscored text practice):
        </label>
        <textarea
          id="spoken-response-input"
          className="speaking-textarea"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type what you would say in this workplace situation…"
          disabled={disabled}
          aria-describedby="speaking-help"
        />
        <p id="speaking-help" className="input-help-text">
          Practicing speaking aloud is encouraged before entering your response.
        </p>
      </div>
      )}
    </article>
  );
}
