import { IntermediateLessonEditor } from '../../../../../../../features/admin-intermediate/intermediate-lesson-editor';
import { isIntermediateCategory } from '@worklingo/content-format';
import { notFound } from 'next/navigation';

export default async function IntermediateNewLessonPage({ params }: { readonly params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isIntermediateCategory(category)) notFound();
  return <IntermediateLessonEditor key={`${category}:new`} category={category} />;
}
