import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber, type MessageValues } from '../../i18n/translator';
import { adminObservabilityMessages } from '../../i18n/messages/adminObservability';

type Key = keyof typeof adminObservabilityMessages.en;
export interface SystemMessage { readonly key: Key; readonly values?: MessageValues }
const labels: Readonly<Record<string, Key>> = {"PENDING": "statusPending", "RUNNING": "statusRunning", "RETRY_WAIT": "statusRetryWait", "COMPLETED": "statusCompleted", "FAILED": "statusFailed"};

export function useAdminObservability() {
  const t = useT('adminObservability', adminObservabilityMessages);
  const { locale } = useLocalePreference();
  const number = (value: number) => formatNumber(locale, value);
  const date = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const label = (value: string) => labels[value] ? t(labels[value]) : value;
  const message = (value: unknown): string => {
    if (typeof value === 'object' && value !== null && 'key' in value) {
      const descriptor = value as SystemMessage;
      return t(descriptor.key, descriptor.values);
    }
    const entry = Object.entries(adminObservabilityMessages.en).find(([, text]) => text === value);
    if (entry) return t(entry[0] as Key);
    return localizedError(value, locale);
  };
  return { t, locale, number, date, label, message };
}
