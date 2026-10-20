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

import './landing.css';

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
      <header className="landing-topbar">
        <GlassSurface className="public-nav-surface"><nav className="public-header-navigation" aria-label={common('publicNavigation')}>
          <p className="landing-brand" id="home-title" translate="no"><Link href="/" className="public-brand-link">WorkLingo</Link></p>
          <div className="public-nav-actions"><LanguageSwitcher /><ThemeControl /></div>
        </nav></GlassSurface>
      </header>
      <section className="landing-hero" aria-labelledby="learning-title">
        <div>
          <h1 className="landing-heading" id="learning-title">
            {t('heading')}
          </h1>
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
          <h2 id="example-title"><svg className="example-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4V5Z" /><path d="M9 9h6m-6 3h4" /></svg>{t('exampleTitle')}</h2>
          <blockquote lang="en">“Could you walk me through the next steps?”</blockquote>
          <p>{t('exampleDescription')}</p>
        </aside>
      </section>
      <section className="landing-principles" aria-labelledby="principles-title">
        <h2 id="principles-title">{t('principlesTitle')}</h2>
        <dl>
          <div className="principle"><dt>{t('learnContext')}</dt>
          <dd>{t('learnContextDescription')}</dd></div>
          <div className="principle"><dt>{t('beyondKeywords')}</dt>
          <dd>{t('beyondKeywordsDescription')}</dd></div>
          <div className="principle"><dt>{t('languageStick')}</dt>
          <dd>{t('languageStickDescription')}</dd></div>
        </dl>
      </section>
    </main>
  );
}
