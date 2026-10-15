'use client';
import Link from 'next/link';
import { useT } from '../../../i18n/provider';
import { authMessages } from '../../../i18n/messages/auth';

import { AuthPage } from '../../../features/auth/auth-page';

export default function LoginPage() {
  const t = useT('auth', authMessages);
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">{t('continueMission')}</p>
        <h1 id="login-title">{t('welcome')}</h1>
        <p>{t('loginDescription')}</p>
        <AuthPage mode="login" />
        <p>
          {t('newHere')} <Link href="/register">{t('createAnAccount')}</Link>
        </p>
      </section>
    </main>
  );
}
