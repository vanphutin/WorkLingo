'use client';

import React from 'react';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

export interface ListeningResponseValue {
  answerIndexes: number[];
}

interface ListeningActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: ListeningResponseValue;
  readonly onChange: (value: ListeningResponseValue) => void;
  readonly disabled?: boolean;
}

export function ListeningActivity({
  activity,
  value,
  onChange,
  disabled = false,
}: ListeningActivityProps) {
  const contentItems = activity.content as ReadonlyArray<{
    slug?: string;
    type?: string;
    text?: string;
    audio?: {
      notice?: string;
    };
  }>;
  const questions = (
    (activity.payload.questions as ReadonlyArray<{
      slug: string;
      prompt: string;
      options: readonly string[];
    }>) ?? []
  );

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (disabled) return;
    const nextAnswers = [...value.answerIndexes];
    nextAnswers[questionIndex] = optionIndex;
    onChange({ answerIndexes: nextAnswers });
  };

  const audioNotice =
    contentItems.find((item) => item.audio?.notice)?.audio?.notice ??
    'Audio is not available in this local increment. Use the transcript for now.';

  return (
    <article className="activity-container listening-activity" aria-labelledby="listening-prompt">
      <div className="activity-header">
        <h2 id="listening-prompt" className="activity-prompt">
          {(activity.payload.prompt as string) || 'Listen to the audio and answer the questions.'}
        </h2>
      </div>

      <section className="audio-player-panel" aria-label="Audio player">
        <div className="audio-notice">
          <p className="notice-badge">Local placeholder audio for development</p>
          <p className="notice-description">
            Live audio streaming and speech generation arrive in Increment 4.
          </p>
        </div>

        <p className="audio-status" role="status">
          {audioNotice}
        </p>

        {contentItems.length > 0 && (
          <div className="audio-transcript-box">
            <h3 className="section-subtitle">Audio Content / Transcript</h3>
            {contentItems.map((item, index) => (
              <p key={item.slug ?? index} className="transcript-text">
                {item.text}
              </p>
            ))}
          </div>
        )}
      </section>

      <div className="questions-list">
        {questions.map((question, qIdx) => {
          const selectedOption = value.answerIndexes[qIdx];
          return (
            <fieldset
              key={question.slug ?? qIdx}
              className="question-block"
              disabled={disabled}
            >
              <legend className="question-prompt">
                <span className="question-number">{qIdx + 1}.</span> {question.prompt}
              </legend>
              <div className="options-group" role="radiogroup">
                {question.options.map((option, optIdx) => {
                  const inputId = `listen-q-${qIdx}-opt-${optIdx}`;
                  const isChecked = selectedOption === optIdx;
                  return (
                    <label
                      key={inputId}
                      htmlFor={inputId}
                      className={`option-label ${isChecked ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        id={inputId}
                        name={`listen-question-${qIdx}`}
                        value={optIdx}
                        checked={isChecked}
                        onChange={() => handleSelectOption(qIdx, optIdx)}
                        disabled={disabled}
                      />
                      <span className="option-text">{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </article>
  );
}
