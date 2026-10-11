'use client';

import { useRouter } from 'next/navigation';
import type { AuthUser } from '@worklingo/contracts';

import { AuthForm } from './auth-form';
import { submitAuth } from './submit-auth';

interface AuthPageProps {
  readonly mode: 'login' | 'register';
}

const ADMIN_ROLES = new Set(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);

export function getPostAuthenticationPath(
  user: AuthUser,
): '/admin/content' | '/dashboard' | '/onboarding' {
  if (user.roles.some((role) => ADMIN_ROLES.has(role))) return '/admin/content';
  return user.onboardingStatus === 'PENDING' ? '/onboarding' : '/dashboard';
}

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();

  return (
    <AuthForm
      mode={mode}
      onAuthenticated={(user) => router.replace(getPostAuthenticationPath(user))}
      submit={(input) => submitAuth(mode, input)}
    />
  );
}
