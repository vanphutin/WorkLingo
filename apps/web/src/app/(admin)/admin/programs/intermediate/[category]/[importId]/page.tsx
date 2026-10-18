import { IntermediateLessonEditor } from '../../../../../../../features/admin-intermediate/intermediate-lesson-editor';
import { isIntermediateCategory } from '@worklingo/content-format';
import { notFound } from 'next/navigation';

export default async function IntermediateEditLessonPage({ params }: { readonly params: Promise<{ category: string; importId: string }> }) {
  const { category, importId } = await params;
  if (!isIntermediateCategory(category)) notFound();
  return <IntermediateLessonEditor key={`${category}:${importId}`} category={category} importId={importId} />;
}
