'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AuthUser } from '@worklingo/contracts';

import { AuthForm } from './auth-form';
import { submitAuth } from './submit-auth';
import styles from './auth.module.css';
import { ThemeControl } from '../../components/theme-control';
import { LanguageSwitcher } from '../../components/language-switcher';
import { useLocalePreference, useT } from '../../i18n/provider';
import { authMessages } from '../../i18n/messages/auth';
import { commonMessages } from '../../i18n/messages/common';
import { GlassSurface } from '../../components/glass-surface';

interface AuthPageProps {
  readonly mode: 'login' | 'register';
}

const ADMIN_ROLES = new Set(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);

export function getPostAuthenticationPath(
  user: AuthUser,
): '/admin/content' | '/dashboard' | '/onboarding' {
  if (user.roles.some((role) => ADMIN_ROLES.has(role))) return '/admin/content';
  return user.onboardingStatus === 'PENDING' ? '/onboarding' : '/dashboard';
}

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const t = useT('auth', authMessages);
  const common = useT('common', commonMessages);
  const { synchronizeUser } = useLocalePreference();

  return (
    <div className={styles.content}>
      <a className="skip-link" href="#account-form">{t('skipForm')}</a>
      <GlassSurface className={styles.preferences} role="group" aria-label={common('preferences')}>
        <LanguageSwitcher />
        <ThemeControl />
      </GlassSurface>
      <AuthForm
        mode={mode}
        onAuthenticated={(user) => { synchronizeUser(user); router.replace(getPostAuthenticationPath(user)); }}
        submit={(input) => submitAuth(mode, input)}
      />
      <p className={styles.note}>
        {mode === 'register'
          ? t('registerNext')
          : t('returnPractice')}
      </p>
      <Link className={styles.homeLink} href="/">{t('backHome')}</Link>
    </div>
  );
}
