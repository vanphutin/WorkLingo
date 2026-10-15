export const UI_LOCALES = ['vi', 'en'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];
export const DEFAULT_LOCALE: UiLocale = 'vi';
export const LOCALE_COOKIE = 'worklingo_locale';
export const LOCALE_EVENT_KEY = 'worklingo_locale_event';

export function isUiLocale(value: unknown): value is UiLocale {
  return typeof value === 'string' && UI_LOCALES.some((locale) => locale === value);
}
export function normalizeLocale(value: unknown): UiLocale {
  return isUiLocale(value) ? value : DEFAULT_LOCALE;
}
export function resolveLocale(input: { current?: unknown; account?: unknown; cookie?: unknown }): UiLocale {
  for (const value of [input.current, input.account, input.cookie]) {
    if (isUiLocale(value)) return value;
  }
  return DEFAULT_LOCALE;
}
export function formatLocale(locale: UiLocale): string {
  return { vi: 'vi-VN', en: 'en-US' }[locale];
}
