import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { themeInitScript } from '../lib/theme';
import { LocaleProvider } from '../i18n/provider';
import { getServerPreference } from '../i18n/server';
import { translate } from '../i18n/translator';
import { commonMessages } from '../i18n/messages/common';
import { LocalizedPageTitle } from '../i18n/page-title';
import { AuthenticationTransition } from '../i18n/authentication-transition';
import { TransparencySync } from '../components/transparency-control';

import '../styles/tokens.css';
import '../styles/glass.css';
import './globals.css';
import '../styles/workspace.css';
import '../styles/learning.css';

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getServerPreference();
  return {
  title: {
    default: 'WorkLingo',
    template: '%s | WorkLingo',
  },
  description: translate(locale, 'common', commonMessages)('metadataDescription'),
};
}

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const { locale, userId } = await getServerPreference();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body><LocaleProvider initialLocale={locale} initialUserId={userId}><TransparencySync /><AuthenticationTransition /><LocalizedPageTitle />{children}</LocaleProvider></body>
    </html>
  );
}
