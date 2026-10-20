'use client';

import '../../features/admin-content/admin.css';
import '../../features/admin-dashboard/admin-dashboard.css';

import { AdminLink as Link, AdminNavigationGuardProvider } from '../../features/admin-dashboard/admin-navigation-guard';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { AuthUser } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';
import { ThemeControl } from '../../components/theme-control';
import { AdminBreadcrumbs, AdminNavigation } from '../../features/admin-dashboard/admin-navigation';
import { LanguageSwitcher } from '../../components/language-switcher';
import { useLocalePreference, useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';

const ADMIN_ROLES = new Set(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);

export default function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT('common', commonMessages);
  const { synchronizeUser, clearUser } = useLocalePreference();
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
    <AdminNavigationGuardProvider>
    <div className="admin-shell ad-shell">
      <a className="skip-link" href="#admin-main-content">
        {t('skipAdmin')}
      </a>
      <header className="admin-top-nav">
        <div className="nav-container">
          <div className="nav-left">
            <Link href="/admin" className="brand-logo">
              <span translate="no">WorkLingo</span> <span className="admin-badge">{t('admin')}</span>
            </Link>
          </div>

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
      </header>
      <div className="ad-workspace">
        <AdminNavigation />
        <main id="admin-main-content" tabIndex={-1} className="admin-main-content">
          <AdminBreadcrumbs />
          {children}
        </main>
      </div>
    </div>
    </AdminNavigationGuardProvider>
  );
}
