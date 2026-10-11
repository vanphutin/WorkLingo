import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Placement Assessment',
};

export default function PlacementSessionLayout({ children }: { readonly children: ReactNode }) {
  return children;
}