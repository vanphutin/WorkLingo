import { IntermediateCategoryWorkspace } from '../../../../../../features/admin-intermediate/intermediate-category-workspace';
import { isIntermediateCategory } from '@worklingo/content-format';
import { notFound } from 'next/navigation';

export default async function IntermediateCategoryPage({ params }: { readonly params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isIntermediateCategory(category)) notFound();
  return <IntermediateCategoryWorkspace category={category} />;
}
