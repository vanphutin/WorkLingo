'use client';

import { useState, type FormEvent } from 'react';

import {
  loginInputSchema,
  registerInputSchema,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@worklingo/contracts';

interface AuthFormProps {
  readonly mode: 'login' | 'register';
  readonly onAuthenticated: (user: AuthUser) => void;
  readonly submit: (input: LoginInput | RegisterInput) => Promise<AuthUser>;
}

type FieldErrors = Partial<Record<'displayName' | 'email' | 'password', string>>;

export function AuthForm({ mode, onAuthenticated, submit }: AuthFormProps) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const isRegistration = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(undefined);

    const formData = new FormData(event.currentTarget);
    const rawInput = {
      ...(isRegistration
        ? { displayName: String(formData.get('displayName') ?? '') }
        : {}),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };
    const result = (isRegistration
      ? registerInputSchema
      : loginInputSchema
    ).safeParse(rawInput);

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (
          (field === 'displayName' || field === 'email' || field === 'password') &&
          !errors[field]
        ) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsPending(true);
    try {
      const user = await submit(result.data);
      setIsSuccessful(true);
      onAuthenticated(user);
    } catch {
      setFormError(
        isRegistration
          ? 'Unable to create your account.'
          : 'Email or password is invalid.',
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {isRegistration ? (
        <AuthField
          autoComplete="name"
          error={fieldErrors.displayName}
          label="Display name"
          name="displayName"
          type="text"
        />
      ) : null}
      <AuthField
        autoComplete="email"
        error={fieldErrors.email}
        label="Email"
        name="email"
        type="email"
      />
      <AuthField
        autoComplete={isRegistration ? 'new-password' : 'current-password'}
        error={fieldErrors.password}
        label="Password"
        name="password"
        type="password"
      />

      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      {isSuccessful ? (
        <p aria-live="polite" className="form-status">
          Opening your dashboard…
        </p>
      ) : null}

      <button disabled={isPending || isSuccessful} type="submit">
        {isPending
          ? isRegistration
            ? 'Creating account…'
            : 'Logging in…'
          : isRegistration
            ? 'Create account'
            : 'Log in'}
      </button>
    </form>
  );
}

interface AuthFieldProps {
  readonly autoComplete: string;
  readonly error: string | undefined;
  readonly label: string;
  readonly name: 'displayName' | 'email' | 'password';
  readonly type: 'email' | 'password' | 'text';
}

function AuthField({
  autoComplete,
  error,
  label,
  name,
  type,
}: AuthFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="auth-field">
      <label htmlFor={name}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={name}
        name={name}
        type={type}
      />
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
