import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Learning Programs',
};

export default function ProgramsLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
