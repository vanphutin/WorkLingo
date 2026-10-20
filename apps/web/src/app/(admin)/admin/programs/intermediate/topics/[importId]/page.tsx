import { IntermediateLessonEditor } from '../../../../../../../features/admin-intermediate/intermediate-lesson-editor';
export default async function IntermediateTopicPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  return <IntermediateLessonEditor category="reading" topic importId={importId} />;
}
