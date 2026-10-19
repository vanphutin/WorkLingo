'use client';

import { useEffect, useState } from 'react';
import { useT } from '../../i18n/provider';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { adminIntermediateMessages } from '../../i18n/messages/adminIntermediate';
import type { IntermediateLessonDraft } from './lesson-model';

export function TopicLessonOutline({ prefix, draft, hasReview, canSave }: {
  prefix: string; draft: IntermediateLessonDraft; hasReview: boolean; canSave: boolean;
}) {
  const t = useT('intermediateTopics', intermediateTopicsMessages);
  const ta = useT('adminIntermediate', adminIntermediateMessages);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState('');
  const id = (key: string) => `${prefix}-${key}`;
  const items = [
    { key: 'json', label: t('jsonTitle') }, { key: 'basics', label: ta('basics') },
    { key: 'passage', label: t('passage') },
    { key: 'reading-questions', label: t('outlineReading', { count: draft.readingQuestions.length }), questions: draft.readingQuestions, skill: 'reading' as const },
    { key: 'warmup', label: t('activate') }, { key: 'language', label: t('language') },
    { key: 'listening', label: t('outlineListening', { count: draft.listeningQuestions.length }), questions: draft.listeningQuestions, skill: 'listening' as const },
    { key: 'speaking', label: ta('speaking') }, { key: 'writing', label: ta('writing') },
    ...(canSave ? [{ key: 'save', label: t('outlineSave') }] : []),
    ...(hasReview ? [{ key: 'review', label: t('reviewTitle') }, { key: 'lifecycle', label: ta('lifecycle') }] : []),
  ];
  const targets = items.flatMap(item => [id(item.key), ...(item.questions?.map((_, index) => id(`${item.skill}-question-${index + 1}`)) ?? [])]).join('|');
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1200px)');
    const change = () => setExpanded(media.matches);
    change(); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-5% 0px -75% 0px', threshold: 0 });
    targets.split('|').forEach(target => { const element = document.getElementById(target); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [targets]);
  function link(key: string, label: string) {
    const targetId = id(key);
    return <a href={`#${targetId}`} aria-current={active === targetId ? 'location' : undefined} onClick={() => {
      const target = document.getElementById(targetId);
      const disclosure = target?.closest('details');
      if (disclosure) disclosure.open = true;
      target?.focus({ preventScroll: true }); setActive(targetId);
    }}>{label}</a>;
  }
  const wordCount = draft.readingText.trim() ? draft.readingText.trim().split(/\s+/u).length : 0;
  return <aside className="intermediate-topic-outline">
    <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>{t('outlineTitle')}</summary>
      <nav aria-label={t('outlineTitle')}>
        <p className="intermediate-help">{t('outlineWords', { count: wordCount })}</p>
        <p className="intermediate-help">{t('outlineAdminOnly')}</p>
        <ol>{items.map(item => <li key={item.key}>
          {link(item.key, item.label)}
          {item.questions ? <ol>{item.questions.map((_, index) => <li key={index}>
            {link(`${item.skill}-question-${index + 1}`, ta(item.skill === 'reading' ? 'readingQuestion' : 'listeningQuestion', { count: index + 1 }))}
          </li>)}</ol> : null}
        </li>)}</ol>
      </nav>
    </details>
  </aside>;
}
