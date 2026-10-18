'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { IeltsStudyDuration, IeltsStudyProgressDto, IeltsTopicCatalogDto, StartIeltsTopicSessionInput } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsStudyMessages } from '../../i18n/messages/ieltsStudy';
import { ieltsStudyClient } from '../../lib/api/ielts-study-client';
import { StudySummary } from './study-summary';
import './ielts-study.css';

export function TopicCatalog() {
  const t = useT('ieltsStudy', ieltsStudyMessages);
  const { locale } = useLocalePreference();
  const router = useRouter();
  const [catalog, setCatalog] = useState<IeltsTopicCatalogDto | null>(null);
  const [progress, setProgress] = useState<IeltsStudyProgressDto | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [packSlug, setPackSlug] = useState('');
  const [duration, setDuration] = useState<IeltsStudyDuration>(90);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const pending = useRef<StartIeltsTopicSessionInput | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [topics, evidence] = await Promise.allSettled([ieltsStudyClient.catalog(), ieltsStudyClient.progress()]);
    if (topics.status === 'fulfilled') setCatalog(topics.value); else setError(topics.reason);
    if (evidence.status === 'fulfilled') setProgress(evidence.value);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const topic = catalog?.topics.find(item => item.topicVersionId === topicId);
  const pack = topic?.packs.find(item => item.slug === packSlug);
  const start = async () => {
    if (!topic || !pack || starting) return;
    if (!pending.current || pending.current.topicVersionId !== topic.topicVersionId || pending.current.packSlug !== pack.slug || pending.current.durationMinutes !== duration) pending.current = { clientSessionId: crypto.randomUUID(), topicVersionId: topic.topicVersionId, packSlug: pack.slug, durationMinutes: duration };
    setStarting(true); setError(null);
    try { const session = await ieltsStudyClient.start(pending.current); router.push(`/sessions/${session.id}`); }
    catch (cause) { setError(cause); setStarting(false); }
  };
  const choose = (item: NonNullable<typeof topic>) => {
    setTopicId(item.topicVersionId); setPackSlug(item.packs[0]!.slug); setDuration(item.packs[0]!.supportedDurations.includes(90) ? 90 : item.packs[0]!.supportedDurations[0]!); setError(null);
  };
  return <main className="ielts-study"><header><Link href="/ielts">← {t('back')}</Link><h1>{t('title')}</h1><p>{t('description')}</p></header>
    {progress ? <StudySummary progress={progress} /> : null}
    {error ? <div role="alert"><p>{localizedError(error, locale)}</p><button type="button" disabled={loading || starting} onClick={() => void load()}>{t('retry')}</button></div> : null}
    {!catalog ? <p aria-busy={loading}>{loading ? t('loading') : ''}</p> : !catalog.topics.length ? <section><p>{t('empty')}</p><Link href="/ielts/introduction">{t('introduction')}</Link></section> : <>
      {catalog.recommendations[0] ? <p className="ielts-study__recommendation">{t(catalog.recommendations[0].reason === 'CHOOSE_YOUR_FIRST_TOPIC' ? 'first' : 'recommended')}</p> : null}
      <div className="ielts-study__topics">{catalog.topics.map(item => <article key={item.id} className={topicId === item.topicVersionId ? 'is-selected' : undefined}><h2 lang="en">{item.title}</h2><p>{item.description}</p>{item.activeSessionId ? <Link href={`/sessions/${item.activeSessionId}`}>{t('resume', { title: item.title })}</Link> : null}<button type="button" disabled={starting} aria-pressed={topicId === item.topicVersionId} onClick={() => choose(item)}>{t('choose', { title: item.title })}</button></article>)}</div>
      {topic && pack ? <section className="ielts-study__launch" aria-labelledby="ielts-topic-launch"><h2 id="ielts-topic-launch" lang="en">{topic.title}</h2><div className="ielts-study__selectors"><label>{t('pack')}<select value={packSlug} disabled={starting} onChange={event => { setPackSlug(event.target.value); const next = topic.packs.find(item => item.slug === event.target.value)!; setDuration(next.supportedDurations.includes(90) ? 90 : next.supportedDurations[0]!); }}>{topic.packs.map(item => <option key={item.slug} value={item.slug}>{t(item.difficulty)}</option>)}</select></label><label>{t('duration')}<select value={duration} disabled={starting} onChange={event => setDuration(Number(event.target.value) as IeltsStudyDuration)}>{([90, 120, 150] as const).map(minutes => <option key={minutes} value={minutes} disabled={!pack.supportedDurations.includes(minutes)}>{t('minutes', { minutes })}</option>)}</select></label></div><p>{t('difficultyNote')}</p><h3>{t('vocabulary')} · {t('chunks', { count: pack.chunkCount })}</h3><dl className="ielts-study__chunks">{pack.sampleChunks.map(chunk => <div key={chunk.expression}><dt lang="en">{chunk.expression}</dt><dd lang="vi">{chunk.meaning}</dd><dd lang="en">{chunk.pronunciation} · {chunk.example}</dd></div>)}</dl><h3>{t('contexts')}</h3><ul>{pack.contexts.map(context => <li key={context.slug} lang="en">{context.title}</li>)}</ul><p>{t('syllabus')}</p><p>{t('timeNote')}</p><button type="button" className="ielts-study__primary" disabled={starting || !pack.supportedDurations.includes(duration)} onClick={() => void start()}>{t('start', { minutes: duration })}</button></section> : null}
    </>}
  </main>;
}
