'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../i18n/provider';
import { commonMessages } from '../i18n/messages/common';
import { GlassSurface } from './glass-surface';

export interface NavigationItem {
  readonly href: string;
  readonly label: string;
}

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationIcon({ href }: { readonly href: string }) {
  const drawing = href === '/dashboard' ? 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'
    : href.includes('settings') ? 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4'
    : href === '/mastery' || href.includes('analytics') ? 'M4 20h16M6 16V9M12 16V4M18 16v-5'
    : href.includes('pathway') ? 'M5 5h14v6H5v8h14M5 3v4M19 17v4'
    : 'M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4zM13 7a3 3 0 0 1 3-3h4v14h-4a3 3 0 0 0-3 3';
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={drawing} /></svg>;
}

export function WorkspaceNavigation({ items, label, variant = 'learner', compact = false }: {
  readonly items: readonly NavigationItem[];
  readonly label: string;
  readonly variant?: 'learner' | 'admin';
  readonly compact?: boolean;
}) {
  const pathname = usePathname();
  const t = useT('common', commonMessages);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const active = items.find((item) => isNavigationItemActive(pathname, item.href));
  const groupFor = (href: string) => variant === 'learner'
    ? href === '/settings' ? 'accountGroup' : 'learningGroup'
    : href.startsWith('/admin/settings') || href === '/dashboard' ? 'accountGroup'
      : ['/admin/audit', '/admin/operations', '/admin/analytics'].includes(href) ? 'operationsGroup' : 'authoringGroup';
  const groups = [...new Set(items.map((item) => groupFor(item.href)))];

  // Routing is owned by Next. Only this disclosure resets; children/main never move.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 1000px)');
    if (!media) return; // CSS still provides a usable disclosure without this API.
    let wasWide = media.matches;
    const changed = (event: MediaQueryListEvent) => {
      // Capture/emulation can notify with the same breakpoint; geometry alone
      // must not close an explicitly opened disclosure.
      if (event.matches === wasWide) return;
      wasWide = event.matches;
      setOpen(false);
      // CSS may hide a focused node before the media event, leaving body active.
      const focused = document.activeElement === document.body ? lastFocused.current : document.activeElement;
      if (event.matches && !compact) {
        if (focused === trigger.current) {
          (panel.current?.querySelector<HTMLElement>('[aria-current="page"]')
            ?? panel.current?.querySelector<HTMLElement>('a'))?.focus();
        }
      } else if (focused && panel.current?.contains(focused)) trigger.current?.focus();
    };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, [compact]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        lastFocused.current = null;
        if (open) setOpen(false);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <GlassSurface ref={root} variant={compact ? 'solid' : 'regular'}
    className={`workspace-navigation workspace-navigation-${variant}`} data-open={open} data-compact={compact}
    onFocusCapture={(event) => { if (event.target instanceof HTMLElement) lastFocused.current = event.target; }}
    onBlurCapture={(event) => {
      if (event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) lastFocused.current = null;
    }}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
      }
    }}>
    <div className="navigation-identity"><span className="navigation-monogram" aria-hidden="true">W</span>
      <span><strong translate="no">WorkLingo</strong><small>{variant === 'admin' ? t('adminWorkspace') : t('learnerAccount')}</small></span>
    </div>
    <button type="button" ref={trigger} className="workspace-navigation-toggle" aria-label={label}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
      <span>{label}<small aria-hidden="true">{active?.label ?? t('workspaceNavigation')}</small></span>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <nav ref={panel} id={id} className={`workspace-nav workspace-nav-${variant}`} aria-label={label}
      hidden={compact && !open} onClick={(event) => {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0
          && event.target instanceof Element && event.target.closest('a')) {
          // Same-URL links may not navigate. Never leave focus in a hidden panel;
          // ordinary desktop navigation stays visible and keeps its own focus.
          if (open && panel.current?.contains(document.activeElement)) trigger.current?.focus();
          setOpen(false);
        }
      }}>
      {groups.map((group) => <div className="workspace-nav-group" key={group}>
        <p className="workspace-nav-group-label">{t(group)}</p>
        {items.filter((item) => groupFor(item.href) === group).map(({ href, label: text }) => <Link
          className="workspace-nav-link" key={href} href={href} aria-current={isNavigationItemActive(pathname, href) ? 'page' : undefined}>
          <NavigationIcon href={href} /><span>{text}</span>
        </Link>)}
      </div>)}
    </nav>
  </GlassSurface>;
}
