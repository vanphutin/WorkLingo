import { TopicGroupWorkspace } from '../../../../../../features/admin-intermediate/topic-group-workspace';

export default async function IntermediateTopicGroupsPage({ searchParams }: { searchParams: Promise<{ topicGroupId?: string | string[] }> }) {
  const { topicGroupId } = await searchParams;
  return <TopicGroupWorkspace initialGroupId={typeof topicGroupId === 'string' ? topicGroupId : ''} />;
}
