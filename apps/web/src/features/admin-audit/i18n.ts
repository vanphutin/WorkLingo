import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber, type MessageValues } from '../../i18n/translator';
import { adminAuditMessages } from '../../i18n/messages/adminAudit';

type Key = keyof typeof adminAuditMessages.en;
export interface SystemMessage { readonly key: Key; readonly values?: MessageValues }
const labels: Readonly<Record<string, Key>> = {};

export function useAdminAudit() {
  const t = useT('adminAudit', adminAuditMessages);
  const { locale } = useLocalePreference();
  const number = (value: number) => formatNumber(locale, value);
  const date = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const label = (value: string) => labels[value] ? t(labels[value]) : value;
  const message = (value: unknown): string => {
    if (typeof value === 'object' && value !== null && 'key' in value) {
      const descriptor = value as SystemMessage;
      return t(descriptor.key, descriptor.values);
    }
    const entry = Object.entries(adminAuditMessages.en).find(([, text]) => text === value);
    if (entry) return t(entry[0] as Key);
    return localizedError(value, locale);
  };
  return { t, locale, number, date, label, message };
}
