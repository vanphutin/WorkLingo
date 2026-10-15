import { createTranslator } from 'next-intl';
import { formatLocale, type UiLocale } from './locale';

export interface Messages {
  readonly en: Readonly<Record<string, string>>;
  readonly vi: Readonly<Record<string, string>>;
}
export type MessageValues = Record<string, string | number | Date>;
export type Translator<M extends Messages> = (key: Extract<keyof M['en'] | keyof M['vi'], string>, values?: MessageValues) => string;

/** Uses ICU messages; no request-specific configuration is held in module state. */
export function translate<M extends Messages>(locale: UiLocale, namespace: string, messages: M): Translator<M> {
  const dictionary = { ...messages.en, ...messages[locale] };
  const translator = createTranslator({
    locale: formatLocale(locale),
    messages: dictionary,
    onError: () => { /* CI validates catalogs; an unknown runtime key uses the fallback below. */ },
    getMessageFallback: ({ key }) => `${namespace}.${key}`,
  });
  return (key, values) => translator(String(key), values);
}
export function formatNumber(locale: UiLocale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(formatLocale(locale), options).format(value);
}
export function formatDate(locale: UiLocale, value: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(formatLocale(locale), options).format(new Date(value));
}
export function formatRelativeTime(locale: UiLocale, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  return new Intl.RelativeTimeFormat(formatLocale(locale), { numeric: 'auto' }).format(value, unit);
}
