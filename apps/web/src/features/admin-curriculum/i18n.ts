import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber, type MessageValues } from '../../i18n/translator';
import { adminCurriculumMessages } from '../../i18n/messages/adminCurriculum';

type Key = keyof typeof adminCurriculumMessages.en;
export interface SystemMessage { readonly key: Key; readonly values?: MessageValues }
const labels: Readonly<Record<string, Key>> = {"DRAFT": "statusDraft", "VALIDATED": "statusValidated", "PUBLISHED": "statusPublished", "ARCHIVED": "statusArchived", "NEW": "statusNew", "AVAILABLE": "available", "COMING_SOON": "comingSoon", "IN_DEVELOPMENT": "inDevelopment", "DISABLED": "disabled", "ALREADY_ARCHIVED": "alreadyArchived", "HAS_PUBLISHED_LEVELS": "hasPublishedLevels", "HAS_PUBLISHED_MISSIONS": "hasPublishedMissions", "PLAYABLE_LEVEL_DEPENDENCY": "playableDependency", "ACTIVE_SESSIONS_EXIST": "activeSessions", "grammar": "categoryGrammar", "pronunciation": "categoryPronunciation", "vocabulary": "categoryVocabulary", "reading": "skillReading", "listening": "skillListening", "speaking": "skillSpeaking", "writing": "skillWriting"};

export function useAdminCurriculum() {
  const t = useT('adminCurriculum', adminCurriculumMessages);
  const { locale } = useLocalePreference();
  const number = (value: number) => formatNumber(locale, value);
  const date = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const label = (value: string): string => {
    if (labels[value]) return t(labels[value]);
    const statusReason = /^(Level|Mission) is in (DRAFT|VALIDATED|PUBLISHED|ARCHIVED) status$/.exec(value);
    if (statusReason) return t(statusReason[1] === 'Level' ? 'levelStatusReason' : 'missionStatusReason', { status: label(statusReason[2]!) });
    const entry = Object.entries(adminCurriculumMessages.en).find(([, text]) => text === value);
    return entry ? t(entry[0] as Key) : value;
  };
  const message = (value: unknown): string => {
    if (typeof value === 'object' && value !== null && 'key' in value) {
      const descriptor = value as SystemMessage;
      return t(descriptor.key, descriptor.values);
    }
    const entry = Object.entries(adminCurriculumMessages.en).find(([, text]) => text === (value instanceof Error ? value.message : value));
    if (entry) return t(entry[0] as Key);
    return localizedError(value, locale);
  };
  return { t, locale, number, date, label, message };
}
