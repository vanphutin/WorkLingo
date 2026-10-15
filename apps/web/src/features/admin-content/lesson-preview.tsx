import { useAdminContent } from './i18n';

import React from 'react';

import type { ContentPreviewDto } from '@worklingo/contracts';

export interface LessonPreviewProps {
  readonly preview: ContentPreviewDto;
}

export function LessonPreview({ preview }: LessonPreviewProps) {
  const { t, number, label } = useAdminContent();
  const { normalizedDraft } = preview;

  if (!normalizedDraft) {
    return (
      <div className="preview-empty" role="region" aria-label={t('previewRegion')}>
        <p>{t('noPreview')}</p>
      </div>
    );
  }

  return (
    <div className="lesson-preview-container" role="region" aria-label={t('previewRegion')}>
      <div className="preview-header">
        <h2 className="preview-title" lang="en">{normalizedDraft.title}</h2>
        <div className="preview-meta-row">
          <span className="preview-slug">{normalizedDraft.slug}</span>
          <span className="preview-badge">{label(normalizedDraft.level)}</span>
          <span className="preview-badge">{t('minutes', { count: normalizedDraft.durationMinutes })}</span>
        </div>
        <p className="preview-objective" lang="en">{normalizedDraft.objective}</p>
      </div>

      {normalizedDraft.foundation ? (
        <section className="preview-section" aria-label={t('foundationRegion')}>
          <h3 className="section-title">{t('foundationPedagogy')}</h3>
          <p><strong>{t('validatedPreview')}</strong> · {label(normalizedDraft.foundation.category)} · <code>{normalizedDraft.foundation.templateId} v{number(normalizedDraft.foundation.templateVersion)}</code></p>
          <ul>
            {normalizedDraft.foundation.objectives.map((objective) => (
              <li key={objective.slug}>
                <strong>{objective.slug}</strong>: {objective.statement} ({objective.skills.map(label).join(', ')}){objective.required ? t('required') : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {normalizedDraft.contentBlocks.length > 0 && (
        <section className="preview-section" aria-label={t('contentBlocksRegion')}>
          <h3 className="section-title">{t('contentBlocks')}</h3>
          <div className="content-blocks-list">
            {normalizedDraft.contentBlocks.map((block) => (
              <div key={block.slug} className="preview-content-card">
                <div className="card-header">
                  <span className="block-type-badge">{label(block.type)}</span>
                  <span className="block-slug">{block.slug}</span>
                </div>
                <pre className="preview-text-block" lang="en">{block.text}</pre>
              </div>
            ))}
          </div>
        </section>
      )}

      {normalizedDraft.wordBanks.length > 0 && (
        <section className="preview-section" aria-label={t('wordBanksRegion')}>
          <h3 className="section-title">{t('wordBanks')}</h3>
          <div className="word-banks-list">
            {normalizedDraft.wordBanks.map((bank) => (
              <div key={bank.slug} className="preview-word-bank-card">
                <h4 className="bank-name">{bank.name}</h4>
                <div className="language-blocks-list">
                  {bank.languageBlocks.map((lb) => (
                    <div key={lb.slug} className="preview-language-block">
                      <div className="lb-header">
                        <strong className="canonical-form" lang="en">{lb.canonicalForm}</strong>
                        <span className="pronunciation">{lb.pronunciation}</span>
                        <span className="cefr-badge">{lb.cefrLevel}</span>
                      </div>
                      <p className="meaning" lang="vi">{lb.meaning}</p>
                      {lb.grammarPattern && (
                        <p className="pattern">
                          <strong>{t('pattern')}</strong> <span lang="en">{lb.grammarPattern}</span>
                        </p>
                      )}
                      {lb.collocations.length > 0 && (
                        <div className="collocations">
                          <strong>{t('collocations')}</strong> <span lang="en">{lb.collocations.join(', ')}</span>
                        </div>
                      )}
                      {lb.examples.length > 0 && (
                        <ul className="examples-list" lang="en">
                          {lb.examples.map((ex, idx) => (
                            <li key={idx}>{ex}</li>
                          ))}
                        </ul>
                      )}
                      {lb.commonErrors.length > 0 && (
                        <div className="common-errors">
                          <strong>{t('commonErrors')}</strong> <span lang="en">{lb.commonErrors.join('; ')}</span>
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
        <section className="preview-section" aria-label={t('activities')}>
          <h3 className="section-title">{t('activities')}</h3>
          <div className="activities-list">
            {normalizedDraft.activities.map((act) => (
              <div key={act.slug} className="preview-activity-card">
                <div className="card-header">
                  <span className="activity-order">{t('activity', { count: act.order })}</span>
                  <span className="activity-type-badge">{label(act.activityType)}</span>
                  <span className="learning-block-badge">{label(act.learningBlock)}</span>
                  <span className="activity-slug">{act.slug}</span>
                </div>
                <p className="activity-prompt-text" lang="en">{act.payload.prompt}</p>

                {'questions' in act.payload && act.payload.questions && (
                  <div className="comprehension-questions">
                    {act.payload.questions.map((q, qIndex) => (
                      <div key={q.slug || qIndex} className="question-preview-box">
                        <p className="question-prompt" lang="en">
                          {number(qIndex + 1)}. {q.prompt}
                        </p>
                        <ul className="question-options" lang="en">
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
                        <p className="preview-explanation">{t('explanation')} <span lang="en">{q.explanation}</span></p>
                        <p className="preview-evidence">{t('evidence')} <span lang="en">{q.evidence}</span></p>
                      </div>
                    ))}
                  </div>
                )}

                {'sampleAnswer' in act.payload && act.payload.sampleAnswer && (
                  <div className="response-preview-box">
                    <p className="preview-sample-answer">
                      <strong>{t('sampleAnswer')}</strong> <span lang="en">{act.payload.sampleAnswer}</span>
                    </p>
                    {act.payload.requiredPhrases.length > 0 && (
                      <div className="required-phrases">
                        <strong>{t('requiredPhrases')}</strong>{' '}
                        <span lang="en">{act.payload.requiredPhrases.join(', ')}</span>
                      </div>
                    )}
                    <p className="min-words">
                      <strong>{t('minimumWords')}</strong> {number(act.payload.minWords)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {normalizedDraft.audioScripts && normalizedDraft.audioScripts.length > 0 && (
        <section className="preview-section" aria-label={t('audioScriptsRegion')}>
          <h3 className="section-title">{t('audioScripts')}</h3>
          <div className="audio-scripts-list">
            {normalizedDraft.audioScripts.map((script) => (
              <div key={script.slug} className="preview-audio-script-card">
                <div className="card-header">
                  <span className="script-slug">{script.slug}</span>
                  {script.speaker && <span className="script-speaker">{script.speaker}</span>}
                </div>
                <pre className="preview-text-block" lang="en">{script.script}</pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
