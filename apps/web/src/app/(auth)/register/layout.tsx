import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Create account',
};

export default function RegisterLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
