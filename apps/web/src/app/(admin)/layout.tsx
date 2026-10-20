'use client';

import '../../features/admin-content/admin.css';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { AuthUser } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';
import { ThemeControl } from '../../components/theme-control';
import { WorkspaceNavigation, isNavigationItemActive } from '../../components/workspace-navigation';
import { GlassSurface } from '../../components/glass-surface';
import { LanguageSwitcher } from '../../components/language-switcher';
import { useLocalePreference, useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';

const ADMIN_ROLES = new Set(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);

const adminDestinations = [
  { href: '/admin/content', label: 'content' },
  { href: '/admin/curriculum', label: 'curriculum' },
  { href: '/admin/ielts-orientation', label: 'ieltsOrientation' },
  { href: '/admin/ielts-bridge', label: 'ieltsBridge' },
  { href: '/admin/ielts-integrated', label: 'integrated' },
  { href: '/admin/ielts-mocks', label: 'mocks' },
  { href: '/admin/ielts-band-curriculum', label: 'bandCurriculum' },
  { href: '/admin/audit', label: 'audit' },
  { href: '/admin/operations', label: 'operations' },
  { href: '/admin/analytics', label: 'analytics' },
  { href: '/admin/settings/audio', label: 'audioSettings' },
  { href: '/admin/settings/ai', label: 'aiSettings' },
  { href: '/dashboard', label: 'learnerView' },
] as const;

export default function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT('common', commonMessages);
  const { synchronizeUser, clearUser } = useLocalePreference();
  const destinations = adminDestinations.map((item) => ({ href: item.href, label: t(item.label) }));
  const pathname = usePathname();
  const context = destinations.find((item) => isNavigationItemActive(pathname, item.href))?.label ?? t('adminWorkspace');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [authRetryKey, setAuthRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        setIsLoading(true);
        setAuthError(false);
        const user = await apiClient.getCurrentUser();
        if (isMounted) {
          const hasAdminRole = user.roles.some((role) => ADMIN_ROLES.has(role));
          if (!hasAdminRole) {
            router.replace('/dashboard');
            return;
          }
          setCurrentUser(user);
          synchronizeUser(user);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            clearUser();
            router.replace('/login');
          } else {
            setAuthError(true);
            setIsLoading(false);
          }
        }
      }
    }

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [authRetryKey, router, synchronizeUser, clearUser]);

  if (isLoading) {
    return (
      <div className="admin-loading-screen" role="status">
        <p>{t('loadingAdmin')}</p>
      </div>
    );
  }

  if (authError) {
    return (
      <main className="admin-error-container">
        <div className="status-card error-card" role="alert">
          <h1>{t('unableAdmin')}</h1>
          <p>{t('verifySession')}</p>
          <button
            type="button"
            className="retry-button"
            onClick={() => setAuthRetryKey((key) => key + 1)}
          >
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell application-shell">
      <a className="skip-link" href="#admin-main-content">
        {t('skipAdmin')}
      </a>
      <header className="admin-top-nav">
        <GlassSurface className="shell-header-surface">
          <div className="nav-container">
            <div className="nav-left">
              <Link href="/admin/content" className="brand-logo">
                <span translate="no">WorkLingo</span> <span className="admin-badge">{t('admin')}</span>
              </Link>
            </div>
            <p className="shell-context"><span>{t('adminWorkspace')}</span><strong>{context}</strong></p>

            <div className="nav-user-meta">
              <ThemeControl />
              <LanguageSwitcher />
              <span className="user-greeting">
                {t('adminName', { name: currentUser?.displayName ?? '' })}
              </span>
              <button
                type="button"
                className="logout-button"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/v1/auth/logout', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    if (response.ok) clearUser();
                  } finally {
                    router.push('/login');
                  }
                }}
              >
                {t('signOut')}
              </button>
            </div>
          </div>
        </GlassSurface>
      </header>
      <WorkspaceNavigation items={destinations} label={t('adminWorkspace')} variant="admin" />
      <main id="admin-main-content" tabIndex={-1} className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
