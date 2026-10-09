import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Learner Dashboard',
};

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
