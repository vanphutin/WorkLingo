'use client';

import '../../features/admin-content/admin.css';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { AuthUser } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';

const ADMIN_ROLES = new Set(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);

export default function AdminLayout({
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
          const hasAdminRole = user.roles.some((role) => ADMIN_ROLES.has(role));
          if (!hasAdminRole) {
            router.replace('/dashboard');
            return;
          }
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
      <div className="admin-loading-screen" role="status">
        <p>Loading administration workspace…</p>
      </div>
    );
  }

  if (authError) {
    return (
      <main className="admin-error-container">
        <div className="status-card error-card" role="alert">
          <h1>Unable to open admin workspace</h1>
          <p>We could not verify your session. Check your connection and try again.</p>
          <button
            type="button"
            className="retry-button"
            onClick={() => setAuthRetryKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main-content">
        Skip to administrative content
      </a>
      <header className="admin-top-nav">
        <div className="nav-container">
          <div className="nav-left">
            <Link href="/admin/content" className="brand-logo">
              WorkLingo <span className="admin-badge">Admin</span>
            </Link>
            <nav className="admin-nav-links">
              <Link href="/admin/content" className="nav-link">
                Content
              </Link>
              <Link href="/dashboard" className="nav-link nav-link-secondary">
                Learner View
              </Link>
            </nav>
          </div>

          <div className="nav-user-meta">
            <span className="user-greeting">
              Admin: <strong>{currentUser?.displayName}</strong>
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
      <main id="admin-main-content" className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
