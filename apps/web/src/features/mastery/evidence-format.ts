import type { LearningSkill } from '../../lib/api/api-client';
import { masteryMessages } from '../../i18n/messages/mastery';
import { translate } from '../../i18n/translator';
import type { UiLocale } from '../../i18n/locale';

export const SKILLS: readonly LearningSkill[] = ['reading', 'listening', 'speaking', 'writing'];
const evidenceKeys = {
  NEW: 'new', LEARNING: 'learning', REVIEW_DUE: 'reviewDue', STABLE: 'stable',
  NEEDS_ATTENTION: 'needsAttention', OVERDUE: 'overdue', DUE: 'due', UPCOMING: 'upcoming',
} as const;
export function evidenceLabel(value: string, locale: UiLocale = 'en'): string {
  const key = evidenceKeys[value as keyof typeof evidenceKeys] ?? 'reviewRecommended';
  return translate(locale, 'mastery', masteryMessages)(key);
}
/** Only known, system-authored advice is localized. Unknown prose is retained verbatim. */
export function systemExplanation(value: string, locale: UiLocale): string {
  const key = (Object.keys(masteryMessages.en) as (keyof typeof masteryMessages.en)[])
    .find((key) => masteryMessages.en[key] === value);
  return key ? translate(locale, 'mastery', masteryMessages)(key) : value;
}
export function formatLevel(code: string, locale: UiLocale = 'en'): string {
  const match = /^FOUNDATION_(\d+)$/u.exec(code);
  return match ? translate(locale, 'mastery', masteryMessages)('foundationLevel', { number: match[1]! }) : code;
}
export function percent(score: number, locale: 'en' | 'vi' = 'en'): string {
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(Math.round(score * 100))}%`;
}
export function formatDate(value: string, locale: 'en' | 'vi' = 'en'): string {
  return new Date(value).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
