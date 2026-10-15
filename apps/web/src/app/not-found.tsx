'use client';

import Link from 'next/link';
import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';

export default function NotFound() {
  const t = useT('common', commonMessages);
  return <main className="session-error-container"><section className="status-card">
    <h1>{t('pageNotFound')}</h1><p>{t('notFound')}</p>
    <Link className="primary-button" href="/">{t('backHome')}</Link>
  </section></main>;
}
