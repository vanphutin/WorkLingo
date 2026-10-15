'use client';

import { useT } from '../../../i18n/provider';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

interface GrammarLanguageBlock {
  readonly slug?: string;
  readonly canonicalForm?: string;
  readonly meaning?: string;
  readonly grammarPattern?: string;
  readonly examples?: readonly string[];
  readonly commonErrors?: readonly string[];
}

export function LanguageFocusPanel({ activity }: { readonly activity: LearnerActivityDto }) {
  const t = useT('learningSession', learningSessionMessages);
  if (activity.foundationCategory !== 'grammar') return null;

  const blocks = activity.languageBlocks as readonly GrammarLanguageBlock[];
  const grammarBlocks = blocks.filter((block) => Boolean(block.grammarPattern));
  if (grammarBlocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label={t('grammarFocus')}>
      <header>
        <p className="eyebrow">{t('foundationGrammar')}</p>
        <h3>{t('grammarFocus')}</h3>
      </header>
      <div className="language-focus-grid">
        {grammarBlocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4 lang="en">{block.canonicalForm ?? block.slug}</h4>
            {block.meaning ? <p>{block.meaning}</p> : null}
            <p className="grammar-pattern"><strong>{t('pattern')}</strong> <span lang="en">{block.grammarPattern}</span></p>
            {block.examples?.length ? (
              <div>
                <strong>{t('inContext')}</strong>
                <ul>{block.examples.map((example) => <li key={example} lang="en">{example}</li>)}</ul>
              </div>
            ) : null}
            {block.commonErrors?.length ? (
              <div className="grammar-common-errors">
                <strong>{t('watchOut')}</strong>
                <ul>{block.commonErrors.map((error) => <li key={error} lang="en">{error}</li>)}</ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
