'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../i18n/provider';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';

export function TopicLessonEntry({ groupId }: { groupId: string }) {
  return <TopicEntrySession key={groupId} groupId={groupId} />;
}
function TopicEntrySession({ groupId }: { groupId: string }) {
  const router = useRouter();
  const t = useT('intermediateGroups', intermediateGroupsMessages);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void topicGroupClient.catalog().then(data => {
      if (cancelled) return;
      if (!data.groups.some(group => group.id === groupId)) { router.replace('/admin/programs/intermediate/topic-groups'); return; }
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [groupId, attempt, router]);
  if (status === 'ready') return <IntermediateLessonEditor category="reading" topic initialTopicGroupId={groupId} />;
  return status === 'error' ? <div role="alert"><p>{t('loadError')}</p><button type="button" onClick={() => { setStatus('loading'); setAttempt(n => n + 1); }}>{t('retry')}</button></div>
    : <p role="status">{t('loading')}</p>;
}
