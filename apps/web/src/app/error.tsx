'use client';

import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';

export default function ErrorPage({ retry }: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  const t = useT('common', commonMessages);
  return <main className="session-error-container"><section className="status-card error-card" role="alert">
    <h1>{t('serverError')}</h1><button type="button" className="retry-button" onClick={retry}>{t('retry')}</button>
  </section></main>;
}
