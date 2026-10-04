'use client';

import React from 'react';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

interface SpeakingActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

export function SpeakingActivity({
  activity,
  value,
  onChange,
  disabled = false,
}: SpeakingActivityProps) {
  const prompt = (activity.payload.prompt as string) || 'Respond verbally to the prompt.';

  return (
    <article className="activity-container speaking-activity" aria-labelledby="speaking-prompt">
      <div className="activity-header">
        <h2 id="speaking-prompt" className="activity-prompt">
          {prompt}
        </h2>
      </div>

      <section className="speaking-increment-notice" aria-label="Audio recording status">
        <div className="notice-badge">Increment 4 Feature Notice</div>
        <p className="notice-text">
          Voice recording and automated speech evaluation arrive in <strong>Increment 4</strong>.
          For this foundation slice, please type the spoken response you would practice out loud.
        </p>
      </section>

      <div className="speaking-input-group">
        <label htmlFor="spoken-response-input" className="speaking-label">
          Your spoken response (typed placeholder):
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
    </article>
  );
}
