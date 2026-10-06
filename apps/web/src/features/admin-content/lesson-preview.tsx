import React from 'react';

import type { ContentPreviewDto } from '@worklingo/contracts';

export interface LessonPreviewProps {
  readonly preview: ContentPreviewDto;
}

export function LessonPreview({ preview }: LessonPreviewProps) {
  const { normalizedDraft } = preview;

  if (!normalizedDraft) {
    return (
      <div className="preview-empty" role="region" aria-label="Lesson preview">
        <p>No preview available. Validate your lesson draft without errors to generate a structured preview.</p>
      </div>
    );
  }

  return (
    <div className="lesson-preview-container" role="region" aria-label="Lesson preview">
      <div className="preview-header">
        <h2 className="preview-title">{normalizedDraft.title}</h2>
        <div className="preview-meta-row">
          <span className="preview-slug">{normalizedDraft.slug}</span>
          <span className="preview-badge">{normalizedDraft.level}</span>
          <span className="preview-badge">{normalizedDraft.durationMinutes} minutes</span>
        </div>
        <p className="preview-objective">{normalizedDraft.objective}</p>
      </div>

      {normalizedDraft.contentBlocks.length > 0 && (
        <section className="preview-section" aria-label="Content blocks">
          <h3 className="section-title">Content Blocks</h3>
          <div className="content-blocks-list">
            {normalizedDraft.contentBlocks.map((block) => (
              <div key={block.slug} className="preview-content-card">
                <div className="card-header">
                  <span className="block-type-badge">{block.type}</span>
                  <span className="block-slug">{block.slug}</span>
                </div>
                <pre className="preview-text-block">{block.text}</pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {normalizedDraft.wordBanks.length > 0 && (
        <section className="preview-section" aria-label="Word banks">
          <h3 className="section-title">Word Banks</h3>
          <div className="word-banks-list">
            {normalizedDraft.wordBanks.map((bank) => (
              <div key={bank.slug} className="preview-word-bank-card">
                <h4 className="bank-name">{bank.name}</h4>
                <div className="language-blocks-list">
                  {bank.languageBlocks.map((lb) => (
                    <div key={lb.slug} className="preview-language-block">
                      <div className="lb-header">
                        <strong className="canonical-form">{lb.canonicalForm}</strong>
                        <span className="pronunciation">{lb.pronunciation}</span>
                        <span className="cefr-badge">{lb.cefrLevel}</span>
                      </div>
                      <p className="meaning">{lb.meaning}</p>
                      {lb.grammarPattern && (
                        <p className="pattern">
                          <strong>Pattern:</strong> {lb.grammarPattern}
                        </p>
                      )}
                      {lb.collocations.length > 0 && (
                        <div className="collocations">
                          <strong>Collocations:</strong> {lb.collocations.join(', ')}
                        </div>
                      )}
                      {lb.examples.length > 0 && (
                        <ul className="examples-list">
                          {lb.examples.map((ex, idx) => (
                            <li key={idx}>{ex}</li>
                          ))}
                        </ul>
                      )}
                      {lb.commonErrors.length > 0 && (
                        <div className="common-errors">
                          <strong>Common Errors:</strong> {lb.commonErrors.join('; ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {normalizedDraft.activities.length > 0 && (
        <section className="preview-section" aria-label="Activities">
          <h3 className="section-title">Activities</h3>
          <div className="activities-list">
            {normalizedDraft.activities.map((act) => (
              <div key={act.slug} className="preview-activity-card">
                <div className="card-header">
                  <span className="activity-order">Activity {act.order}</span>
                  <span className="activity-type-badge">{act.activityType}</span>
                  <span className="learning-block-badge">{act.learningBlock}</span>
                  <span className="activity-slug">{act.slug}</span>
                </div>
                <p className="activity-prompt-text">{act.payload.prompt}</p>

                {'questions' in act.payload && act.payload.questions && (
                  <div className="comprehension-questions">
                    {act.payload.questions.map((q, qIndex) => (
                      <div key={q.slug || qIndex} className="question-preview-box">
                        <p className="question-prompt">
                          {qIndex + 1}. {q.prompt}
                        </p>
                        <ul className="question-options">
                          {q.options.map((opt, optIndex) => (
                            <li
                              key={optIndex}
                              className={optIndex === q.answerIndex ? 'option-correct' : 'option-item'}
                            >
                              {optIndex === q.answerIndex ? '✓ ' : '• '}
                              {opt}
                            </li>
                          ))}
                        </ul>
                        <p className="preview-explanation">Explanation: {q.explanation}</p>
                        <p className="preview-evidence">Evidence: {q.evidence}</p>
                      </div>
                    ))}
                  </div>
                )}

                {'sampleAnswer' in act.payload && act.payload.sampleAnswer && (
                  <div className="response-preview-box">
                    <p className="preview-sample-answer">
                      <strong>Sample Answer:</strong> {act.payload.sampleAnswer}
                    </p>
                    {act.payload.requiredPhrases.length > 0 && (
                      <div className="required-phrases">
                        <strong>Required Phrases:</strong>{' '}
                        {act.payload.requiredPhrases.join(', ')}
                      </div>
                    )}
                    <p className="min-words">
                      <strong>Minimum Words:</strong> {act.payload.minWords}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {normalizedDraft.audioScripts && normalizedDraft.audioScripts.length > 0 && (
        <section className="preview-section" aria-label="Audio scripts">
          <h3 className="section-title">Audio Scripts</h3>
          <div className="audio-scripts-list">
            {normalizedDraft.audioScripts.map((script) => (
              <div key={script.slug} className="preview-audio-script-card">
                <div className="card-header">
                  <span className="script-slug">{script.slug}</span>
                  {script.speaker && <span className="script-speaker">{script.speaker}</span>}
                </div>
                <pre className="preview-text-block">{script.script}</pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
