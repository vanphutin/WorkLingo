'use client';
import type { IeltsStudyProgressDto } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { ieltsStudyMessages } from '../../i18n/messages/ieltsStudy';

export function StudySummary({ progress }: { progress: IeltsStudyProgressDto }) {
  const t = useT('ieltsStudy', ieltsStudyMessages);
  return <section className="ielts-study__summary" aria-labelledby="ielts-study-evidence"><h2 id="ielts-study-evidence">{t('summary')}</h2><div className="ielts-study__counts"><span>{t('completed', { count: progress.completedSessionCount })}</span><span>{t('practiced', { count: progress.practicedChunkCount })}</span><span>{t('pending', { count: progress.pendingEvaluationCount })}</span><span>{t('due', { count: progress.dueReviewCount })}</span>{progress.masteredChunkCount > 0 ? <span>{t('mastered', { count: progress.masteredChunkCount })}</span> : null}</div><p>{t('evidenceNote')}</p><dl className="ielts-study__skills">{progress.skills.map(skill => <div key={skill.skill}><dt>{t(skill.skill)}</dt><dd>{skill.score === null ? t('noScore') : `${Math.round(skill.score * 100)}% · ${t('evaluated', { count: skill.evaluatedCount })}`}</dd>{skill.pendingCount ? <dd>{t('skillPending', { count: skill.pendingCount })}</dd> : null}</div>)}</dl></section>;
}
