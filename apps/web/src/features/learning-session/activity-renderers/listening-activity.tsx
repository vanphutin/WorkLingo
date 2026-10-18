'use client';

import { useT } from '../../../i18n/provider';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import React, { useId, useState } from 'react';

import { apiClient, type LearnerActivityDto } from '../../../lib/api/api-client';
import { LessonAudioPlayer } from '../../audio/lesson-audio-player';

export interface ListeningResponseValue {
  answerIndexes: number[];
}

interface ListeningActivityProps {
  readonly activity: LearnerActivityDto;
  readonly value: ListeningResponseValue;
  readonly onChange: (value: ListeningResponseValue) => void;
  readonly disabled?: boolean;
  readonly sessionId: string;
}

export function ListeningActivity(props: ListeningActivityProps) {
  return <ListeningPractice key={`${props.sessionId}:${props.activity.id}`} {...props} />;
}

function ListeningPractice({
  activity,
  value,
  onChange,
  disabled = false,
  sessionId,
}: ListeningActivityProps) {
  const t = useT('learningSession', learningSessionMessages);
  const [completedListens, setCompletedListens] = useState(0);
  const [scriptState, setScriptState] = useState<'unopened' | 'shown' | 'hidden'>('unopened');
  const scriptShown = scriptState === 'shown';
  const scriptId = useId();
  const contentItems = activity.content as ReadonlyArray<{
    slug?: string;
    type?: string;
    text?: string;
    audio?: {
      kind?: string;
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

  const audioUrl = apiClient.getActivityAudioUrl(sessionId, activity.id);

  const transcript = contentItems.map((item) => item.text ?? '').filter(Boolean).join('\n');
  const usesSimulationPlaceholder = contentItems.some(
    (item) => item.audio?.kind === 'textPlaceholder',
  );
  const hasUnansweredQuestion = questions.some((question, index) => {
    const answer = value.answerIndexes[index];
    return !Number.isInteger(answer) || answer === undefined || answer < 0 || answer >= question.options.length;
  });
  const canRevealScript = completedListens >= 6 && hasUnansweredQuestion && transcript.length > 0;

  return (
    <article className="activity-container listening-activity" aria-labelledby="listening-prompt">
      <div className="activity-header">
        <h2 id="listening-prompt" className="activity-prompt" lang={activity.payload.prompt ? "en" : undefined}>
          {(activity.payload.prompt as string) || t('listeningFallback')}
        </h2>
      </div>

      <section className="audio-player-panel" aria-label={t('audioPlayer')}>
        <LessonAudioPlayer
          audioUrl={audioUrl}
          dialogue={contentItems.some(item => item.type === 'dialogue')}
          preferBrowserSpeech={usesSimulationPlaceholder}
          onPlaybackComplete={() => setCompletedListens((count) => count + 1)}
          text={transcript}
        />

        {transcript.length > 0 && (
          <div className="listening-script-help">
            {!scriptShown && <p className="audio-settings-note" role="status">
              {t('listeningScriptHelp', { count: completedListens })}
            </p>}
            {(canRevealScript || scriptState !== 'unopened') && (
              <button type="button" className="secondary-action-button" aria-expanded={scriptShown} aria-controls={scriptId} onClick={() => setScriptState(scriptShown ? 'hidden' : 'shown')}>
                {t(scriptShown ? 'hideScript' : 'showScript')}
              </button>
            )}
          </div>
        )}

        {scriptShown && (
          <div id={scriptId} className="audio-transcript-box">
            <h3 className="section-subtitle">{t('transcript')}</h3>
            {contentItems.map((item, index) => (
              <p key={item.slug ?? index} className="transcript-text" lang="en">
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
              <legend className="question-prompt" lang="en">
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
