'use client';

import { useT } from '../../../i18n/provider';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import React from 'react';

import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { LanguageFocusPanel } from './language-focus-panel';
import { VocabularyFocusPanel } from './vocabulary-focus-panel';

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
  const t = useT('learningSession', learningSessionMessages);
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
        <h2 id="activity-prompt" className="activity-prompt" lang={activity.payload.prompt ? "en" : undefined}>
          {(activity.payload.prompt as string) || t('readingFallback')}
        </h2>
      </div>

      {contentItems.length > 0 && (
        <section className="activity-reading-passage" aria-label={t('readingPassage')}>
          {contentItems.map((item, index) => (
            <div key={item.slug ?? index} className="reading-content-item">
              <pre className="reading-text" lang="en">{item.text}</pre>
            </div>
          ))}
        </section>
      )}

      {activity.languageBlocks.length > 0 && (
        <section className="activity-language-blocks" aria-label={t('keyLanguageBlocks')}>
          <h3 className="section-subtitle">{t('keyLanguage')}</h3>
          <ul className="language-block-chips">
            {activity.languageBlocks.map((lb, index) => {
              const label =
                (lb.canonicalForm as string) || (lb.slug as string) || t('blockFallback', { count: index + 1 });
              return (
                <li key={(lb.slug as string) ?? index} className="language-block-chip" lang="en">
                  {label}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <LanguageFocusPanel activity={activity} />
      <VocabularyFocusPanel activity={activity} />

      <div className="questions-list">
        {questions.map((question, qIdx) => {
          const selectedOption = value.answerIndexes[qIdx];
          return (
            <fieldset
              key={question.slug ?? qIdx}
              className="question-block"
              disabled={disabled}
            >
              <legend className="question-prompt" lang="en">
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
                      <span className="option-text" lang="en">{option}</span>
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
