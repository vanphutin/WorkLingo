'use client';
import { useEffect, useState } from 'react';
import type { VocabularyPublicationReview, VocabularyPublicationSelection } from '@worklingo/contracts';
import { apiClient } from '../../lib/api/api-client';
import { useT, useLocalePreference } from '../../i18n/provider';
import { vocabularyPublicationMessages } from '../../i18n/messages/vocabularyPublication';
import { useAdminContent } from './i18n';
import styles from './vocabulary-review.module.css';

export function VocabularyReview({ importId, draftRevision, sourceHash, disabled, onChange }: {
  importId: string; draftRevision: number; sourceHash: string; disabled: boolean;
  onChange: (selection: VocabularyPublicationSelection | null) => void;
}) {
  const t = useT('vocabularyPublication', vocabularyPublicationMessages); const { locale } = useLocalePreference(); const { message } = useAdminContent();
  const [review, setReview] = useState<VocabularyPublicationReview | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null); const [attempt, setAttempt] = useState(0); const [loading, setLoading] = useState(true);
  function emit(value: VocabularyPublicationReview, selected: Record<string, string>) {
    onChange(value.entries.every(entry => Boolean(selected[entry.sourceSlug])) ? {
      reviewHash: value.reviewHash, choices: value.entries.map(entry => selected[entry.sourceSlug] === 'new'
        ? { sourceSlug: entry.sourceSlug, action: 'new' as const }
        : { sourceSlug: entry.sourceSlug, action: 'reuse' as const, languageBlockId: selected[entry.sourceSlug]! }),
    } : null);
  }
  useEffect(() => {
    let alive = true; onChange(null); setLoading(true); setError(null);
    void apiClient.getVocabularyPublicationReview(importId).then(value => {
      if (!alive) return;
      if (value.draftRevision !== draftRevision || value.sourceHash !== sourceHash) throw { code: 'VOCABULARY_SOURCE_STALE', status: 409 };
      const selected = Object.fromEntries(value.entries.filter(entry => entry.candidates.length === 0).map(entry => [entry.sourceSlug, 'new']));
      setReview(value); setChoices(selected); emit(value, selected); setLoading(false);
    }).catch(failure => { if (alive) { setError(failure); setLoading(false); } });
    return () => { alive = false; };
  // onChange is stable for a draft; emit uses that same callback.
  }, [importId, draftRevision, sourceHash, attempt, onChange]);
  function reload() { onChange(null); setReview(null); setChoices({}); setAttempt(value => value + 1); }
  return <section className={styles.review} aria-label={t('title')} aria-busy={loading}>
    <div className={styles.heading}><h4>{t('title')}</h4><button type="button" className="btn btn-secondary" disabled={disabled || loading} onClick={reload}>{t('retry')}</button></div>
    <p>{t('help')}</p>
    {loading ? <p role="status">{t('loading')}</p> : error ? <p role="alert">{message(error)}</p> : review ? <>
      <p>{t('topic', { name: review.topic ? (locale === 'en' && review.topic.nameEn ? review.topic.nameEn : review.topic.name) : t('ungrouped') })}</p>
      <p className={styles.progress} role="status">{t('progress', { done: review.entries.filter(entry => choices[entry.sourceSlug]).length, total: review.entries.length })}</p>
      <div className={styles.entries}>{review.entries.map(entry => <fieldset key={entry.sourceSlug} className={styles.entry} disabled={disabled}>
        <legend>{entry.expression}</legend><small>{t('source', { slug: entry.sourceSlug })}</small>
        <p>{t('incoming', { meaning: entry.meaning })}</p>
        {entry.candidates.length === 0 ? <p className={styles.fresh}>{t('fresh')}</p> : <>
          <p className={styles.warning}>{t('duplicate')}</p>
          {entry.candidates.map(candidate => <div key={candidate.id} className={styles.candidate}>
            <label className={styles.choice}>
              <input type="radio" name={`vocabulary-${entry.sourceSlug}`} aria-label={t('reuse', { meaning: candidate.meaning })} checked={choices[entry.sourceSlug] === candidate.id}
                onChange={() => { const selected = { ...choices, [entry.sourceSlug]: candidate.id }; setChoices(selected); emit(review, selected); }} />
              <span><strong>{t('reuse', { meaning: candidate.meaning })}</strong><small>{candidate.expression} {candidate.pronunciation}</small></span>
            </label>
            <div className={styles.contexts}><small>{t('origin', { name: candidate.originBankName })}</small>
              {candidate.contexts.length ? <><p>{t('contexts')}</p><ul>{candidate.contexts.map((context, index) => <li key={`${context.lessonVersionId}-${context.topicGroupId}-${index}`}>
                {(locale === 'en' ? context.topicNameEn ?? context.topicName : context.topicName) ?? t('ungrouped')} / {context.lessonTitle}
              </li>)}</ul>{candidate.contextCount > candidate.contexts.length ? <small>{t('more', { count: candidate.contextCount - candidate.contexts.length })}</small> : null}</> : <p>{t('noContexts')}</p>}
            </div>
          </div>)}
          <label className={`${styles.choice} ${styles.newMeaning}`}><input type="radio" name={`vocabulary-${entry.sourceSlug}`} aria-label={t('create', { meaning: entry.meaning })}
            checked={choices[entry.sourceSlug] === 'new'} onChange={() => { const selected = { ...choices, [entry.sourceSlug]: 'new' }; setChoices(selected); emit(review, selected); }} />
            <strong>{t('create', { meaning: entry.meaning })}</strong>
          </label>
        </>}
      </fieldset>)}</div>
    </> : null}
  </section>;
}
