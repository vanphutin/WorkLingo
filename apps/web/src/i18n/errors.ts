import { type UiLocale } from './locale';
import { commonMessages } from './messages/common';
import { translate } from './translator';

/** Display mapping only. Preserve the original error, status, code and request ID. */
export function localizedError(error: unknown, locale: UiLocale): string {
  const t = translate(locale, 'common', commonMessages);
  const payload = typeof error === 'object' && error !== null ? error as { code?: unknown; status?: unknown } : {};
  const code = typeof payload.code === 'string' ? payload.code : '';
  if (code === 'NETWORK_ERROR' || error instanceof TypeError) return t('networkError');
  if (code === 'UNAUTHORIZED' || payload.status === 401) return t('unauthorized');
  if (code === 'FORBIDDEN' || payload.status === 403) return t('forbidden');
  if (code === 'NOT_FOUND' || payload.status === 404) return t('notFound');
  if (code === 'CONFLICT' || payload.status === 409) return t('conflict');
  if (code === 'BAD_REQUEST' || payload.status === 400) return t('invalidInput');
  if (code === 'RATE_LIMIT_EXCEEDED' || payload.status === 429) return t('rateLimited');
  if (code === 'INSUFFICIENT_CONTENT' || code === 'CONTENT_NOT_READY' || payload.status === 422) return t('unavailableContent');
  return t('serverError');
}
