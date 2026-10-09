import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Content Admin',
};

export default function AdminContentLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
