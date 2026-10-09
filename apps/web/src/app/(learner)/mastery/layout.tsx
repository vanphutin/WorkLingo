import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mastery and Memory',
};

export default function MasteryLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
