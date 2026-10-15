import { getServerT } from '../../../i18n/server';
import { metadataMessages } from '../../../i18n/messages/metadata';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT('metadata', metadataMessages);
  return { title: t('mastery') };
}

export default function MasteryLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
