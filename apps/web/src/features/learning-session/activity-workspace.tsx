'use client';

import React, { useId, type ReactNode } from 'react';
import { useT } from '../../i18n/provider';
import { learningSessionMessages } from '../../i18n/messages/learningSession';
import type { LearnerActivityDto } from '../../lib/api/api-client';
import './session-workspace.css';

export interface ActivityWorkspaceTools {
  readonly actions: ReactNode;
  readonly support: ReactNode;
}

interface Props {
  readonly activity: LearnerActivityDto;
  readonly children: ReactNode;
  readonly tools?: ActivityWorkspaceTools;
  readonly source?: { readonly label: string; readonly content: ReactNode };
}

export function ActivityWorkspace({ activity, children, tools, source }: Props) {
  const t = useT('learningSession', learningSessionMessages);
  const id = useId();
  // Listening supplies its own player and gated transcript; never expose its raw source here.
  const texts = activity.activityType === 'listening' ? [] : activity.content.filter(item => typeof item.text === 'string' && item.text.trim());
  const hasSource = source !== undefined || texts.length > 0;
  const sourceLabel = source?.label ?? t('sourceText');
  return <div className={`activity-workspace${hasSource ? ' activity-workspace-with-source' : ''}`}>
    {hasSource ? <section className="activity-source-pane" aria-label={sourceLabel} id={`${id}-source`} tabIndex={0}>
      <div className="activity-pane-heading"><h2>{sourceLabel}</h2><a className="activity-pane-jump" href={`#${id}-response`}>{t('jumpToResponse')}</a></div>
      {source ? source.content : texts.map((item, index) => <pre key={typeof item.slug === 'string' ? item.slug : index} className="reading-text" lang="en">{String(item.text)}</pre>)}
    </section> : null}
    <div className="activity-response-pane">
      <section className="activity-response-card" aria-label={t('questionsAndResponse')} id={`${id}-response`}>
        {hasSource ? <a className="activity-pane-jump" href={`#${id}-source`}>{t('backToSource')}</a> : null}
        {children}
        {tools?.actions}
      </section>
      {hasSource ? tools?.support : null}
    </div>
    {!hasSource ? tools?.support : null}
  </div>;
}
