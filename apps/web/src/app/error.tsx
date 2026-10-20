'use client';

import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';
import styles from './error-state.module.css';

export default function ErrorPage({ retry }: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  const t = useT('common', commonMessages);
  return <main className={`session-error-container ${styles.page}`}><section className={`status-card error-card ${styles.card}`} role="alert">
    <h1>{t('serverError')}</h1><button type="button" className="retry-button" onClick={retry}>{t('retry')}</button>
  </section></main>;
}
