import Link from 'next/link';

import { AuthPage } from '../../../features/auth/auth-page';

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="register-title">
        <p className="eyebrow">Build practical English</p>
        <h1 id="register-title">Start with WorkLingo</h1>
        <p>Create your learner profile and begin at the right level.</p>
        <AuthPage mode="register" />
        <p>
          Already learning with us? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
