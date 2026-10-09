import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Learning Session',
};

export default function LearningSessionLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
