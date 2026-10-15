'use client';

import { useT } from '../../../i18n/provider';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

interface VocabularyLanguageBlock {
  readonly slug?: string;
  readonly canonicalForm?: string;
  readonly meaning?: string;
  readonly collocations?: readonly string[];
  readonly transferContexts?: readonly string[];
}

export function VocabularyFocusPanel({ activity }: { readonly activity: LearnerActivityDto }) {
  const t = useT('learningSession', learningSessionMessages);
  if (activity.foundationCategory !== 'vocabulary') return null;

  const blocks = activity.languageBlocks as readonly VocabularyLanguageBlock[];
  if (blocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label={t('vocabularyFocus')}>
      <header>
        <p className="eyebrow">{t('foundationVocabulary')}</p>
        <h3>{t('vocabularyFocus')}</h3>
      </header>
      <div className="language-focus-grid">
        {blocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4 lang="en">{block.canonicalForm ?? block.slug}</h4>
            {block.meaning ? <p>{block.meaning}</p> : null}
            {block.collocations?.length ? (
              <div>
                <strong>{t('usefulChunks')}</strong>
                <ul>{block.collocations.map((item) => <li key={item} lang="en">{item}</li>)}</ul>
              </div>
            ) : null}
            {block.transferContexts?.length ? (
              <div>
                <strong>{t('transferContexts')}</strong>
                <ul>{block.transferContexts.map((context) => <li key={context}>{context}</li>)}</ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
