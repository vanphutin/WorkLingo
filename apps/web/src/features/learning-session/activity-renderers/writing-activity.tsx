'use client';

import React from 'react';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

interface WritingActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

export function WritingActivity({
  activity,
  value,
  onChange,
  disabled = false,
}: WritingActivityProps) {
  const prompt = (activity.payload.prompt as string) || 'Write your response below.';
  const rubric = activity.payload.rubric as string | undefined;

  return (
    <article className="activity-container writing-activity" aria-labelledby="writing-prompt">
      <div className="activity-header">
        <h2 id="writing-prompt" className="activity-prompt">
          {prompt}
        </h2>
      </div>

      {rubric && (
        <section className="writing-rubric-box" aria-label="Writing guidelines">
          <h3 className="section-subtitle">Writing guidelines & rubric</h3>
          <p className="rubric-text">{rubric}</p>
        </section>
      )}

      <div className="writing-input-group">
        <label htmlFor="written-response-textarea" className="writing-label">
          Your written response:
        </label>
        <textarea
          id="written-response-textarea"
          className="writing-textarea"
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Compose your workplace message here…"
          disabled={disabled}
          aria-describedby="writing-help"
        />
        <p id="writing-help" className="input-help-text">
          Focus on clarity, appropriate workplace tone, and key vocabulary.
        </p>
      </div>
    </article>
  );
}
