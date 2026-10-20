'use client';
import { useT } from '../../i18n/provider';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import './topic-authoring-steps.css';

export function TopicAuthoringSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  const t = useT('intermediateGroups', intermediateGroupsMessages);
  const labels = ['chooseTopicStep', 'writeLessonStep', 'reviewStep', 'publishStep'] as const;
  return <nav className="topic-authoring-steps" aria-label={t('workflowTitle')}><ol>{labels.map((label, index) =>
    <li key={label} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{t(label)}</li>)}</ol></nav>;
}
