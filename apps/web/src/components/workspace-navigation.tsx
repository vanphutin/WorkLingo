'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';

export interface NavigationItem {
  readonly href: string;
  readonly label: string;
}

export function WorkspaceNavigation({ items, label, variant = 'learner' }: {
  readonly items: readonly NavigationItem[];
  readonly label: string;
  readonly variant?: 'learner' | 'admin';
}) {
  const pathname = usePathname();
  const t = useT('common', commonMessages);
  const links = (
    <nav className={`workspace-nav workspace-nav-${variant}`} aria-label={label}>
      {items.map(({ href, label: text }) => (
        <Link className="workspace-nav-link" key={href} href={href}
          aria-current={pathname === href || pathname?.startsWith(`${href}/`) ? 'page' : undefined}>
          {text}
        </Link>
      ))}
    </nav>
  );
  if (variant === 'learner') return links;
  return <details className="admin-navigation" open><summary>{t('workspaceNavigation')}</summary>{links}</details>;
}
