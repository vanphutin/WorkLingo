'use client';
import { useEffect, useRef, useState } from 'react';
import { generatedIntermediateTopicSchema, supportedSessionDurations, type AiProviderId, type AiSettings, type GeneratedIntermediateTopic, type SessionDuration, type TopicVocabularyDifficulty } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { topicGenerationMessages } from '../../i18n/messages/topicGeneration';
import { aiSettingsClient } from '../../lib/api/ai-settings-client';
import { ApiError } from '../../lib/api/api-client';
import { intermediateTopicClient } from '../../lib/api/intermediate-topic-client';

type Props = { topicGroupId: string; dirty: boolean; disabled: boolean; onApply: (candidate: GeneratedIntermediateTopic) => void; onBusyChange?: (busy: boolean) => void };
export function TopicAiGenerator(props: Props) { return <GeneratorSession key={props.topicGroupId} {...props} />; }
function GeneratorSession({ topicGroupId, dirty, disabled, onApply, onBusyChange }: Props) {
  const t = useT('topicGeneration', topicGenerationMessages);
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [provider, setProvider] = useState<AiProviderId>('discovery');
  const [duration, setDuration] = useState<SessionDuration>(60);
  const [difficulty, setDifficulty] = useState<TopicVocabularyDifficulty>('medium');
  const [level, setLevel] = useState<'B1' | 'B2'>('B1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'settingsError' | 'requestError' | 'vocabularyUnavailable' | null>(null);
  const [candidate, setCandidate] = useState<GeneratedIntermediateTopic | null>(null);
  const [applied, setApplied] = useState(false);
  const live = useRef(false);
  const inFlight = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; onBusyChange?.(false); }; }, [onBusyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    if (mode !== 'ai') return;
    let cancelled = false;
    setSettings(null); setError(null);
    void aiSettingsClient.get().then(value => {
      if (cancelled) return;
      setSettings(value);
      setProvider(value.providers.find(p => p.available && p.id === value.effectiveProvider)?.id ?? value.providers.find(p => p.available)?.id ?? 'discovery');
    }).catch(() => { if (!cancelled) setError('settingsError'); });
    return () => { cancelled = true; };
  }, [mode, attempt]);
  const configured = Boolean(settings && !settings.simulation && settings.routingEnabled && settings.providers.some(p => p.id === provider && p.available));
  const blocked = disabled || busy;
  function invalidate() { setCandidate(null); setApplied(false); setError(null); }
  async function generate() {
    if (blocked || inFlight.current || !configured || !topicGroupId) return;
    inFlight.current = true; setBusy(true); invalidate();
    try {
      const result = generatedIntermediateTopicSchema.parse(await intermediateTopicClient.generate({ topicGroupId, durationMinutes: duration, provider, level, difficulty }));
      if (result.topicGroupId !== topicGroupId || result.plan.durationMinutes !== duration || result.provider !== provider || result.topic.level !== level) throw new Error('Mismatched generation result');
      if (live.current) setCandidate(result);
    } catch (cause) { if (live.current) setError(cause instanceof ApiError && cause.code === 'TOPIC_VOCABULARY_UNAVAILABLE' ? 'vocabularyUnavailable' : 'requestError'); }
    finally { if (live.current) { inFlight.current = false; setBusy(false); } }
  }
  return <section className="intermediate-card" aria-label={t('title')}>
    <h2>{t('title')}</h2>
    <fieldset disabled={blocked}><legend>{t('method')}</legend>
      <label><input type="radio" name="topic-entry-method" checked={mode === 'manual'} onChange={() => { setMode('manual'); invalidate(); }} /> {t('manual')}</label>{' '}
      <label><input type="radio" name="topic-entry-method" checked={mode === 'ai'} onChange={() => { setMode('ai'); invalidate(); }} /> {t('ai')}</label>
    </fieldset>
    {mode === 'ai' ? <>
      <p className="intermediate-help">{t('help')}</p>
      {!topicGroupId ? <p role="status">{t('selectTopic')}</p> : null}
      {!settings && !error ? <p role="status">{t('loading')}</p> : null}
      <div className="intermediate-grid">
        <label className="intermediate-field">{t('provider')}<select value={provider} disabled={blocked || !settings} onChange={event => { setProvider(event.target.value as AiProviderId); invalidate(); }}>
          {(['discovery', 'openai'] as const).map(id => <option key={id} value={id} disabled={!settings?.providers.some(p => p.id === id && p.available)}>{t(id)}{settings && !settings.providers.some(p => p.id === id && p.available) ? ` — ${t('unavailable')}` : ''}</option>)}
        </select></label>
        <label className="intermediate-field">{t('duration')}<select value={duration} disabled={blocked} onChange={event => { setDuration(Number(event.target.value) as SessionDuration); invalidate(); }}>
          {supportedSessionDurations.map(minutes => <option key={minutes} value={minutes}>{t('minutes', { minutes })}</option>)}
        </select></label>
        <label className="intermediate-field">{t('difficulty')}<select value={difficulty} disabled={blocked} onChange={event => { setDifficulty(event.target.value as TopicVocabularyDifficulty); invalidate(); }}>
          {(['easy', 'medium', 'hard'] as const).map(value => <option key={value} value={value}>{t(value)}</option>)}
        </select></label>
        <label className="intermediate-field">{t('level')}<select value={level} disabled={blocked} onChange={event => { setLevel(event.target.value as 'B1' | 'B2'); invalidate(); }}><option value="B1">B1</option><option value="B2">B2</option></select></label>
      </div>
      {settings && !configured ? <p className="intermediate-help">{t('configure')} <a href="/settings/ai">{t('settings')}</a></p> : null}
      {error ? <p role="alert" className="intermediate-notice intermediate-error">{t(error)}</p> : null}
      {error === 'settingsError' ? <button type="button" disabled={blocked} onClick={() => { setError(null); setAttempt(n => n + 1); }}>{t('retry')}</button> : null}
      <button type="button" disabled={blocked || !configured || !topicGroupId} onClick={() => void generate()}>{t(busy ? 'generating' : 'generate')}</button>
      {busy ? <p role="status" aria-live="polite">{t('generating')}</p> : null}
      {candidate ? <div className="intermediate-section-body">
        <p className="intermediate-eyebrow">{t('preview')}</p><h3>{candidate.topic.title}</h3><p>{candidate.topic.objective}</p>
        <p>{t('provenance', { provider: t(candidate.provider), model: candidate.model })}</p>
        <p>{t('summary', { minutes: candidate.plan.durationMinutes, language: candidate.topic.languageBlocks.length, reading: candidate.topic.readingQuestions.length, listening: candidate.topic.listeningQuestions.length })}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{candidate.topic.readingText}</p>
        <button type="button" disabled={blocked} onClick={() => {
          if (disabled || (dirty && !window.confirm(t('replace')))) return;
          onApply(candidate); setCandidate(null); setApplied(true);
        }}>{t('apply')}</button>
      </div> : null}
      {applied ? <p role="status">{t('applied')}</p> : null}
    </> : null}
  </section>;
}
