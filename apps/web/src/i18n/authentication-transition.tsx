'use client';

import { useEffect } from 'react';

/** Re-resolve account data and locale together after a cookie changes in another tab. */
export function AuthenticationTransition() {
  useEffect(() => {
    const transition = () => window.location.reload();
    window.addEventListener('worklingo-account-changed', transition);
    return () => window.removeEventListener('worklingo-account-changed', transition);
  }, []);
  return null;
}
