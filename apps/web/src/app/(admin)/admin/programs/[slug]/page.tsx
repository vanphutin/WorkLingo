import { AdminDashboard } from '../../../../../features/admin-dashboard/admin-dashboard';

export default async function AdminProgramPage({ params }: { readonly params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AdminDashboard programSlug={slug} />;
}
