'use client';
import Link from 'next/link';
import { useT } from '../../../i18n/provider';
import { authMessages } from '../../../i18n/messages/auth';

import { AuthPage } from '../../../features/auth/auth-page';

export default function RegisterPage() {
  const t = useT('auth', authMessages);
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="register-title">
        <p className="eyebrow">{t('practicalEnglish')}</p>
        <h1 id="register-title">{t('start')}</h1>
        <p>{t('registerDescription')}</p>
        <AuthPage mode="register" />
        <p>
          {t('alreadyLearning')} <Link href="/login">{t('logIn')}</Link>
        </p>
      </section>
    </main>
  );
}
