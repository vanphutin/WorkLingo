import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { formatNumber, type MessageValues } from '../../i18n/translator';
import { adminContentMessages } from '../../i18n/messages/adminContent';

type Key = keyof typeof adminContentMessages.en;
export interface ContentMessage { readonly key: Key; readonly values?: MessageValues }
const labels: Readonly<Record<string, Key>> = {
  "DRAFT": "statusDraft",
  "VALIDATED": "statusValidated",
  "PUBLISHED": "statusPublished",
  "ARCHIVED": "statusArchived",
  "GENERATING": "statusGenerating",
  "MISSING": "statusMissing",
  "READY": "statusReady",
  "FAILED": "statusFailed",
  "STALE": "statusStale",
  "listenReason": "blockListenReason",
  "PENDING": "statusPending",
  "grammar": "categoryGrammar",
  "pronunciation": "categoryPronunciation",
  "vocabulary": "categoryVocabulary",
  "reading": "skillReading",
  "listening": "skillListening",
  "speaking": "skillSpeaking",
  "writing": "skillWriting",
  "foundation": "levelFoundation",
  "email": "typeEmail",
  "dialogue": "typeDialogue",
  "article": "typeArticle",
  "text": "typeText",
  "chat": "typeChat",
  "activate": "blockActivate",
  "readDecode": "blockReadDecode",
  "listenDecode": "blockListenDecode",
  "respond": "blockRespond",
  "reflect": "blockReflect"
};

export function useAdminContent() {
  const t = useT('adminContent', adminContentMessages);
  const { locale } = useLocalePreference();
  const number = (value: number) => formatNumber(locale, value);
  const date = (value: string) => new Date(value).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const label = (value: string) => labels[value] ? t(labels[value]) : value;
  const message = (value: unknown): string => {
    if (typeof value === 'object' && value !== null && 'code' in value) {
      if (value.code === 'NARRATION_REVIEW_REQUIRED') return t('narrationReviewRequired');
      if (value.code === 'VOCABULARY_REVIEW_REQUIRED') return t('vocabularyReviewRequired');
      if (value.code === 'VOCABULARY_REVIEW_STALE') return t('vocabularyReviewStale');
      if (value.code === 'VOCABULARY_SOURCE_STALE') return t('vocabularySourceStale');
      if (value.code === 'VOCABULARY_SELECTION_INVALID') return t('vocabularySelectionInvalid');
    }
    if (typeof value === 'object' && value !== null && 'code' in value && value.code === 'LANGUAGE_BLOCK_IDENTITY_CONFLICT') {
      return t('vocabularyIdentityConflict');
    }
    if (typeof value === 'object' && value !== null && 'key' in value) {
      const descriptor = value as ContentMessage;
      return t(descriptor.key, descriptor.values);
    }
    const entry = Object.entries(adminContentMessages.en).find(([, text]) => text === (value instanceof Error ? value.message : value));
    if (entry) return t(entry[0] as Key);
    return localizedError(value, locale);
  };
  return { t, locale, number, date, label, message };
}
