'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { AuthUser } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';

export default function LearnerLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
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
          setCurrentUser(user);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
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
  }, [authRetryKey, router]);

  if (isLoading) {
    return (
      <div className="learner-loading-screen" role="status">
        <p>Loading your learning space…</p>
      </div>
    );
  }

  if (authError) {
    return (
      <main className="session-error-container">
        <div className="status-card error-card" role="alert">
          <h1>Unable to open your learning space</h1>
          <p>We could not verify your session. Check your connection and try again.</p>
          <button type="button" className="retry-button" onClick={() => setAuthRetryKey((key) => key + 1)}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="learner-shell">
      <a className="skip-link" href="#learner-main-content">
        Skip to learning content
      </a>
      <header className="learner-top-nav">
        <div className="nav-container">
          <Link href="/dashboard" className="brand-logo">
            WorkLingo
          </Link>

          <div className="nav-user-meta">
            <span className="user-greeting">
              Learner: <strong>{currentUser?.displayName}</strong>
            </span>
            <button
              type="button"
              className="logout-button"
              onClick={async () => {
                try {
                  await fetch('/api/v1/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                  });
                } finally {
                  router.push('/login');
                }
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div id="learner-main-content" className="learner-content">
        {children}
      </div>
    </div>
  );
}
