import Link from 'next/link';

import { AuthPage } from '../../../features/auth/auth-page';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">Continue your mission</p>
        <h1 id="login-title">Welcome back</h1>
        <p>Return to your next WorkLingo learning block.</p>
        <AuthPage mode="login" />
        <p>
          New to WorkLingo? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
