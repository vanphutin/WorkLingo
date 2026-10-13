'use client';

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
  if (props.activity.activityType !== 'speaking' || props.activity.payload.mode !== 'shadowing') {
    return null;
  }

  const sampleAnswer = props.activity.payload.sampleAnswer;
  if (typeof sampleAnswer !== 'string' || sampleAnswer.length === 0) return null;
  const blocks = (props.activity.languageBlocks as readonly PronunciationLanguageBlock[])
    .filter((block) => Boolean(block.pronunciation));
  if (blocks.length === 0) return null;

  return (
    <section className="language-focus-panel" aria-label="Pronunciation focus">
      <header>
        <p className="eyebrow">Foundation · Pronunciation</p>
        <h3>Pronunciation focus</h3>
      </header>
      <div className="language-focus-grid">
        {blocks.map((block, index) => (
          <article className="language-focus-card" key={block.slug ?? index}>
            <h4>{block.canonicalForm ?? block.slug}</h4>
            <p className="pronunciation-guide"><strong>Pronunciation:</strong> {block.pronunciation}</p>
          </article>
        ))}
      </div>
      <div className="pronunciation-model">
        <p><strong>Model:</strong> {sampleAnswer}</p>
        <LessonAudioPlayer
          audioUrl={apiClient.getActivityAudioUrl(props.sessionId, props.activity.id)}
          preferBrowserSpeech
          text={sampleAnswer}
        />
      </div>
    </section>
  );
}
