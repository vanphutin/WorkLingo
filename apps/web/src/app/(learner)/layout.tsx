'use client';

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

const learnerDestinations = [
  { href: '/dashboard', label: 'dashboard' },
  { href: '/programs', label: 'programs' },
  { href: '/mastery', label: 'mastery' },
  { href: '/ielts/pathway', label: 'ieltsPathway' },
  { href: '/settings', label: 'settings' },
] as const;

export default function LearnerLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT('common', commonMessages);
  const { synchronizeUser, clearUser } = useLocalePreference();
  const destinations = learnerDestinations.map((item) => ({ href: item.href, label: t(item.label) }));
  const pathname = usePathname();
  const isLearningSession = /^\/(?:sessions\/[^/]+|onboarding\/placement\/[^/]+|ielts\/(?:bridge|practice|mock-tests)\/[^/]+)(?:\/|$)/u.test(pathname);
  const context = isLearningSession ? t('focusMode') : destinations.find((item) => isNavigationItemActive(pathname, item.href))?.label ?? t('learningNavigation');
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
          if (user.onboardingStatus === 'PENDING' && !pathname.startsWith('/onboarding')) {
            router.replace('/onboarding');
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
  }, [authRetryKey, pathname, router, synchronizeUser, clearUser]);

  if (isLoading) {
    return (
      <div className="learner-loading-screen" role="status">
        <p>{t('loadingLearner')}</p>
      </div>
    );
  }

  if (authError) {
    return (
      <main className="session-error-container">
        <div className="status-card error-card" role="alert">
          <h1>{t('unableLearner')}</h1>
          <p>{t('verifySession')}</p>
          <button type="button" className="retry-button" onClick={() => setAuthRetryKey((key) => key + 1)}>
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className={`learner-shell application-shell${isLearningSession ? ' learning-mode' : ''}`}>
      <a className="skip-link" href="#learner-main-content">
        {t('skipLearning')}
      </a>
      <header className="learner-top-nav">
        <GlassSurface variant={isLearningSession ? 'solid' : 'regular'} className="shell-header-surface">
          <div className="nav-container">
            <Link href="/dashboard" className="brand-logo" translate="no">
              WorkLingo
            </Link>
            <p className="shell-context"><span>{t('learnerAccount')}</span><strong>{context}</strong></p>

            <div className="nav-user-meta">
              <ThemeControl />
              <LanguageSwitcher />
              {currentUser?.roles.some((role) => role === 'CONTENT_ADMIN' || role === 'SYSTEM_ADMIN') ?
                <Link href="/admin/content" className="nav-link">{t('adminWorkspace')}</Link> : null}
              <div className="user-greeting" aria-label={t('signedInAs', { name: currentUser?.displayName ?? t('learner') })}>
                <span className="user-avatar" aria-hidden="true">
                  {currentUser?.displayName?.trim().charAt(0).toUpperCase() ?? 'L'}
                </span>
                <span className="user-identity">
                  <span className="user-identity-label">{t('learnerAccount')}</span>
                  <strong>{currentUser?.displayName}</strong>
                </span>
              </div>
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
      <WorkspaceNavigation items={destinations} label={t('learningNavigation')} compact={isLearningSession} />

      <div id="learner-main-content" tabIndex={-1} className="learner-content">
        {children}
      </div>
    </div>
  );
}
