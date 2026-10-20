'use client';

import { useT } from '../../../i18n/provider';
import { learningSessionMessages } from '../../../i18n/messages/learningSession';

import type { LearnerActivityDto } from '../../../lib/api/api-client';
import { apiClient } from '../../../lib/api/api-client';
import { LessonAudioPlayer } from '../../audio/lesson-audio-player';

interface PronunciationLanguageBlock {
  readonly slug?: string;
  readonly canonicalForm?: string;
  readonly pronunciation?: string;
}

export function PronunciationFocusPanel(props: {
  readonly activity: LearnerActivityDto;
  readonly sessionId: string;
}) {
  const t = useT('learningSession', learningSessionMessages);
  if (props.activity.activityType !== 'speaking' || props.activity.payload.mode !== 'shadowing') {
    return null;
  }

  const sampleAnswer = props.activity.payload.sampleAnswer;
  if (typeof sampleAnswer !== 'string' || sampleAnswer.length === 0) return null;
  const blocks = (props.activity.languageBlocks as readonly PronunciationLanguageBlock[])
    .filter((block) => Boolean(block.pronunciation));
  if (blocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label={t('pronunciationFocus')}>
      <header>
        <p className="eyebrow">{t('foundationPronunciation')}</p>
        <h3>{t('pronunciationFocus')}</h3>
      </header>
      <div className="language-focus-grid">
        {blocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4 lang="en">{block.canonicalForm ?? block.slug}</h4>
            <p className="pronunciation-guide"><strong>{t('pronunciation')}</strong> <span lang="en">{block.pronunciation}</span></p>
          </article>
        ))}
      </div>
      <div className="pronunciation-model">
        <p><strong>{t('model')}</strong> <span lang="en">{sampleAnswer}</span></p>
        <LessonAudioPlayer
          audioUrl={apiClient.getActivityAudioUrl(props.sessionId, props.activity.id)}
          preferBrowserSpeech
          text={props.activity.audioText ?? sampleAnswer}
        />
      </div>
    </section>
  );
}
