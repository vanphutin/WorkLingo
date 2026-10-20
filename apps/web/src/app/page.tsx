'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeControl } from '../components/theme-control';
import { apiClient } from '../lib/api/api-client';
import { LanguageSwitcher } from '../components/language-switcher';
import { useT } from '../i18n/provider';
import { publicMessages } from '../i18n/messages/public';
import { commonMessages } from '../i18n/messages/common';
import { GlassSurface } from '../components/glass-surface';

const landingStyles = `
  .landing-page .landing-topbar { margin-block-end: clamp(2rem, 5vw, 3rem); }
  .landing-page .public-nav-surface { width: 100%; padding: 1rem 1.25rem; }
  .landing-page .public-header-navigation { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-4); }
  .landing-page .public-header-navigation .landing-brand { margin: 0; }
  .landing-page .public-brand-link { display: inline-flex; align-items: center; min-height: 44px; color: var(--text-primary); text-decoration: none; }
  .landing-page .public-nav-actions { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-inline-start: auto; min-width: 0; }
  .landing-page .public-nav-actions select { border-color: var(--control-border); font-size: 1rem; }
  .landing-page .public-nav-actions select:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
  .landing-page .skip-link { z-index: var(--z-toast); max-width: calc(100vw - 1.5rem); }
  main.landing-page {
    display: block;
    min-height: 100dvh;
    max-width: 76rem;
    padding: clamp(1.5rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3rem);
    color: var(--foreground);
  }
  .landing-page .landing-brand {
    margin: 0 0 3rem;
    font-size: 1.25rem;
    line-height: 1.3;
    letter-spacing: -.04em;
  }
  .landing-page .landing-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr);
    align-items: center;
    gap: clamp(2rem, 6vw, 5rem);
  }
  .landing-page .landing-heading {
    max-width: 13ch;
    margin: 0 0 1.5rem;
    font-size: clamp(2.5rem, 4.8vw, 3.65rem);
    line-height: 1.08;
    letter-spacing: -.045em;
    text-wrap: balance;
  }
  .landing-page .landing-lede {
    max-width: 36ch;
    color: var(--muted);
    font-size: 1.125rem;
    line-height: 1.7;
  }
  .landing-page .landing-actions {
    display: flex;
    flex-wrap: wrap;
    gap: .75rem;
    margin-top: 2rem;
  }
  .landing-page .landing-actions a { white-space: nowrap; }
  .landing-page .landing-example {
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: clamp(1.5rem, 3vw, 2.5rem);
    background: var(--surface-soft);
  }
  .landing-page .landing-example h3 {
    margin: 0 0 2rem;
    color: var(--primary);
    font-size: .9rem;
    font-weight: 600;
  }
  .landing-page .landing-example blockquote {
    margin: 0 0 1.5rem;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(1.6rem, 2.8vw, 2.15rem);
    line-height: 1.4;
    letter-spacing: -.025em;
    text-wrap: balance;
  }
  .landing-page .landing-example p {
    margin: 0;
    color: var(--muted);
    line-height: 1.65;
  }
  .landing-page .landing-principles {
    display: grid;
    grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
    gap: clamp(2rem, 6vw, 5rem);
    border-top: 1px solid var(--border);
    margin-top: clamp(3rem, 7vw, 5rem);
    padding-top: 2rem;
  }
  .landing-page .landing-principles h2 {
    max-width: 18ch;
    margin: 0;
    font-size: clamp(1.6rem, 3vw, 2.1rem);
    line-height: 1.25;
    letter-spacing: -.03em;
    text-wrap: balance;
  }
  .landing-page .landing-principles dl { margin: 0; }
  .landing-page .landing-principles dt { font-weight: 700; }
  .landing-page .landing-principles dd {
    margin: .5rem 0 1.5rem;
    color: var(--muted);
    line-height: 1.65;
  }
  .landing-page .landing-principles dd:last-child { margin-bottom: 0; }
  @media (max-width: 767px) {
    .landing-page .landing-brand { margin-bottom: 2rem; }
    .landing-page .landing-hero,
    .landing-page .landing-principles { grid-template-columns: minmax(0, 1fr); }
    .landing-page .landing-heading { max-width: 15ch; }
  }
`;

export default function HomePage() {
  const t = useT('public', publicMessages);
  const common = useT('common', commonMessages);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient.getCurrentUser()
      .then(() => { if (active) setHasSession(true); })
      .catch(() => { if (active) setHasSession(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="home-page landing-page" id="main-content" tabIndex={-1}>
      <a className="skip-link" href="#main-content">{t('skipMain')}</a>
      <style>{landingStyles}</style>
      <header className="landing-topbar">
        <GlassSurface className="public-nav-surface"><nav className="public-header-navigation" aria-label={common('publicNavigation')}>
          <h1 className="landing-brand" id="home-title" translate="no"><Link href="/" className="public-brand-link">WorkLingo</Link></h1>
          <div className="public-nav-actions"><LanguageSwitcher /><ThemeControl /></div>
        </nav></GlassSurface>
      </header>
      <section className="landing-hero" aria-labelledby="learning-title">
        <div>
          <h2 className="landing-heading" id="learning-title">
            {t('heading')}
          </h2>
          <p className="landing-lede">
            {t('lede')}
          </p>
          <div className="landing-actions">
            {hasSession === true ? (
              <Link className="primary-button" href="/dashboard">{t('openDashboard')}</Link>
            ) : hasSession === false ? <>
              <Link className="primary-button" href="/register">{t('createFreeAccount')}</Link>
              <Link className="secondary-button" href="/login">{t('logIn')}</Link>
            </> : <span className="landing-session-check" role="status">{t('checking')}</span>}
          </div>
        </div>
        <aside className="landing-example" aria-labelledby="example-title">
          <h3 id="example-title">{t('exampleTitle')}</h3>
          <blockquote lang="en">“Could you walk me through the next steps?”</blockquote>
          <p>{t('exampleDescription')}</p>
        </aside>
      </section>
      <section className="landing-principles" aria-labelledby="principles-title">
        <h2 id="principles-title">{t('principlesTitle')}</h2>
        <dl>
          <dt>{t('learnContext')}</dt>
          <dd>{t('learnContextDescription')}</dd>
          <dt>{t('beyondKeywords')}</dt>
          <dd>{t('beyondKeywordsDescription')}</dd>
          <dt>{t('languageStick')}</dt>
          <dd>{t('languageStickDescription')}</dd>
        </dl>
      </section>
    </main>
  );
}
