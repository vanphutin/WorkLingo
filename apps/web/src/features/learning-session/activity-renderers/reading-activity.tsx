'use client';

import React from 'react';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

export interface ReadingResponseValue {
  answerIndexes: number[];
}

interface ReadingActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: ReadingResponseValue;
  readonly onChange: (value: ReadingResponseValue) => void;
  readonly disabled?: boolean;
}

export function ReadingActivity({
  activity,
  value,
  onChange,
  disabled = false,
}: ReadingActivityProps) {
  const contentItems = activity.content as ReadonlyArray<{
    slug?: string;
    type?: string;
    text?: string;
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

  return (
    <article className="activity-container reading-activity" aria-labelledby="activity-prompt">
      <div className="activity-header">
        <h2 id="activity-prompt" className="activity-prompt">
          {(activity.payload.prompt as string) || 'Read the following text and answer all questions.'}
        </h2>
      </div>

      {contentItems.length > 0 && (
        <section className="activity-reading-passage" aria-label="Reading passage">
          {contentItems.map((item, index) => (
            <div key={item.slug ?? index} className="reading-content-item">
              <pre className="reading-text">{item.text}</pre>
            </div>
          ))}
        </section>
      )}

      {activity.languageBlocks.length > 0 && (
        <section className="activity-language-blocks" aria-label="Key language blocks">
          <h3 className="section-subtitle">Key language to notice:</h3>
          <ul className="language-block-chips">
            {activity.languageBlocks.map((lb, index) => {
              const label =
                (lb.canonicalForm as string) || (lb.slug as string) || `Block ${index + 1}`;
              return (
                <li key={(lb.slug as string) ?? index} className="language-block-chip">
                  {label}
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
                  const inputId = `q-${qIdx}-opt-${optIdx}`;
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
                        name={`question-${qIdx}`}
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
