'use client';
import Link from 'next/link';
import { LanguageSwitcher } from '../../../components/language-switcher';
import { ThemeControl } from '../../../components/theme-control';
import { TransparencyControl } from '../../../components/transparency-control';
import { GlassSurface } from '../../../components/glass-surface';
import { useT } from '../../../i18n/provider';
import { commonMessages } from '../../../i18n/messages/common';
import { aiMessages } from '../../../i18n/messages/ai';
import './settings.css';

export default function SettingsPage() {
  const t = useT('common', commonMessages);
  const ai = useT('ai', aiMessages);
  return (
    <main className="settings-page">
      <header className="settings-header">
        <span className="eyebrow">{t('preferences')}</span>
        <h1>{t('settings')}</h1>
        <p>{t('settingsDescription')}</p>
      </header>
      <section className="settings-grid" aria-label={t('availableSettings')}>
        <Link className="settings-card settings-navigation-card" href="/settings/ai"><span><strong>{ai('title')}</strong><small>{ai('aiDescription')}</small></span><span aria-hidden="true">→</span></Link>
        <Link className="settings-card settings-navigation-card settings-audio-card" href="/settings/audio">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" /></svg>
          <span><strong>{t('audio')}</strong><small>{t('audioDescription')}</small></span>
          <span aria-hidden="true">→</span>
        </Link>
        <div className="settings-card settings-language-card"><span><strong>{t('language')}</strong><small>{t('languageDescription')}</small></span><LanguageSwitcher /></div>
        <GlassSurface variant="solid" className="settings-card appearance-preferences">
          <h2>{t('appearance')}</h2>
          <ThemeControl />
          <TransparencyControl />
        </GlassSurface>
      </section>
    </main>
  );
}
