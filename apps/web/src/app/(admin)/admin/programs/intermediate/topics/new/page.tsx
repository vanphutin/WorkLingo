import { redirect } from 'next/navigation';
import { z } from 'zod';
import { TopicLessonEntry } from '../../../../../../../features/admin-intermediate/topic-lesson-entry';
export default async function NewIntermediateTopicPage({ searchParams }: { searchParams: Promise<{ topicGroupId?: string | string[] | undefined }> }) {
  const result = z.uuid().safeParse((await searchParams).topicGroupId);
  if (!result.success) redirect('/admin/programs/intermediate/topic-groups');
  return <TopicLessonEntry groupId={result.data} />;
}
