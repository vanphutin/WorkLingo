'use client';

import type { LearnerActivityDto } from '../../../lib/api/api-client';

interface VocabularyLanguageBlock {
  readonly slug?: string;
  readonly canonicalForm?: string;
  readonly meaning?: string;
  readonly collocations?: readonly string[];
  readonly transferContexts?: readonly string[];
}

export function VocabularyFocusPanel({ activity }: { readonly activity: LearnerActivityDto }) {
  if (activity.foundationCategory !== 'vocabulary') return null;

  const blocks = activity.languageBlocks as readonly VocabularyLanguageBlock[];
  if (blocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label="Vocabulary focus">
      <header>
        <p className="eyebrow">Foundation · Vocabulary</p>
        <h3>Vocabulary focus</h3>
      </header>
      <div className="language-focus-grid">
        {blocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4>{block.canonicalForm ?? block.slug}</h4>
            {block.meaning ? <p>{block.meaning}</p> : null}
            {block.collocations?.length ? (
              <div>
                <strong>Useful chunks</strong>
                <ul>{block.collocations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}
            {block.transferContexts?.length ? (
              <div>
                <strong>Use it again when</strong>
                <ul>{block.transferContexts.map((context) => <li key={context}>{context}</li>)}</ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
