import { onboardingMessages } from '../../i18n/messages/onboarding';
import { translate } from '../../i18n/translator';
import type { UiLocale } from '../../i18n/locale';

/** Display-only mappings for system labels; unknown curriculum prose is never rewritten. */
export function onboardingSystemText(value: string, locale: UiLocale): string {
  const t = translate(locale, 'onboarding', onboardingMessages);
  const key = (Object.keys(onboardingMessages.en) as (keyof typeof onboardingMessages.en)[])
    .find((key) => onboardingMessages.en[key] === value);
  if (key) return t(key);
  const level = /^(?:Foundation (\d+)|FOUNDATION_(\d+))$/u.exec(value);
  if (level) return t('foundationLevel', { number: level[1] ?? level[2]! });
  const summary = /^(.+) is the current recommendation\.$/u.exec(value);
  if (summary) return t('recommendedSummary', { level: onboardingSystemText(summary[1]!, locale) });
  const policy = /^The current four-skill evidence supports (\S+) under (\S+)\.$/u.exec(value);
  if (policy) return t('policySummary', { level: onboardingSystemText(policy[1]!, locale), policy: policy[2]! });
  const selected = /^Selected (\S+) as the highest currently eligible policy candidate\.$/u.exec(value);
  if (selected) return t('selectedCandidate', { level: onboardingSystemText(selected[1]!, locale) });
  return value;
}
