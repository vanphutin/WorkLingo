'use client';

import { useRouter } from 'next/navigation';

import { AuthForm } from './auth-form';
import { submitAuth } from './submit-auth';

interface AuthPageProps {
  readonly mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();

  return (
    <AuthForm
      mode={mode}
      onAuthenticated={() => router.replace('/dashboard')}
      submit={(input) => submitAuth(mode, input)}
    />
  );
}
