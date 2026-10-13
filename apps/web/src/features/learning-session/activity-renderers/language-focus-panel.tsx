'use client';

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
  if (activity.foundationCategory !== 'grammar') return null;

  const blocks = activity.languageBlocks as readonly GrammarLanguageBlock[];
  const grammarBlocks = blocks.filter((block) => Boolean(block.grammarPattern));
  if (grammarBlocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label="Grammar focus">
      <header>
        <p className="eyebrow">Foundation · Grammar</p>
        <h3>Grammar focus</h3>
      </header>
      <div className="language-focus-grid">
        {grammarBlocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4>{block.canonicalForm ?? block.slug}</h4>
            {block.meaning ? <p>{block.meaning}</p> : null}
            <p className="grammar-pattern"><strong>Pattern:</strong> {block.grammarPattern}</p>
            {block.examples?.length ? (
              <div>
                <strong>In context</strong>
                <ul>{block.examples.map((example) => <li key={example}>{example}</li>)}</ul>
              </div>
            ) : null}
            {block.commonErrors?.length ? (
              <div className="grammar-common-errors">
                <strong>Watch out</strong>
                <ul>{block.commonErrors.map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
