'use client';

import { useState, type FormEvent } from 'react';

import {
  loginInputSchema,
  registerInputSchema,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@worklingo/contracts';

import styles from './auth.module.css';
import { useLocalePreference, useT } from '../../i18n/provider';
import { authMessages } from '../../i18n/messages/auth';
import { localizedError } from '../../i18n/errors';
import { ApiError } from '../../lib/api/api-client';

interface AuthFormProps {
  readonly mode: 'login' | 'register';
  readonly onAuthenticated: (user: AuthUser) => void;
  readonly submit: (input: LoginInput | RegisterInput) => Promise<AuthUser>;
}

type AuthKey = keyof typeof authMessages.en;
type FieldErrors = Partial<Record<'displayName' | 'email' | 'password', AuthKey>>;

export function AuthForm({ mode, onAuthenticated, submit }: AuthFormProps) {
  const t = useT('auth', authMessages);
  const { locale } = useLocalePreference();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ key?: AuthKey; cause?: unknown }>();
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
        ? { displayName: String(formData.get('displayName') ?? ''), locale }
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
          errors[field] = field === 'displayName' ? (issue.code === 'too_big' ? 'nameMax' : 'nameMin')
            : field === 'email' ? 'invalidEmail'
            : issue.code === 'too_big' ? 'passwordMax' : isRegistration ? 'passwordMin' : 'passwordRequired';
        }
      }
      setFieldErrors(errors);
      const firstInvalidField = Object.keys(errors)[0];
      const control = firstInvalidField ? event.currentTarget.elements.namedItem(firstInvalidField) : null;
      if (control instanceof HTMLElement) control.focus();
      return;
    }

    setIsPending(true);
    try {
      const user = await submit(result.data);
      setIsSuccessful(true);
      onAuthenticated(user);
    } catch (error) {
      setFormError(error instanceof ApiError && error.status !== 401 && error.status !== 409
        ? { cause: error }
        : { key: error instanceof ApiError && error.status === 409 ? 'duplicateEmail' : isRegistration ? 'registerFailed' : 'invalidLogin' });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form id="account-form" tabIndex={-1} aria-busy={isPending} className={`auth-form ${styles.form}`} noValidate onSubmit={handleSubmit}>
      {isRegistration ? (
        <AuthField
          autoComplete="name"
          error={fieldErrors.displayName ? t(fieldErrors.displayName) : undefined}
          label={t('displayName')}
          name="displayName"
          type="text"
        />
      ) : null}
      <AuthField
        autoComplete="email"
        error={fieldErrors.email ? t(fieldErrors.email) : undefined}
        label={t('email')}
        name="email"
        type="email"
      />
      <AuthField
        autoComplete={isRegistration ? 'new-password' : 'current-password'}
        error={fieldErrors.password ? t(fieldErrors.password) : undefined}
        hint={isRegistration ? t('passwordHint') : undefined}
        label={t('password')}
        name="password"
        type="password"
      />

      {formError ? (
        <p className={`form-error ${styles.formError}`} role="alert">
          {formError.key ? t(formError.key) : localizedError(formError.cause, locale)}
        </p>
      ) : null}
      {isSuccessful ? (
        <p aria-live="polite" className={`form-status ${styles.status}`}>
          {t('opening')}
        </p>
      ) : null}

      <button className={`primary-button ${styles.submit}`} disabled={isPending || isSuccessful} type="submit">
        {isPending
          ? isRegistration
            ? t('creating')
            : t('loggingIn')
          : isRegistration
            ? t('createAccount')
            : t('logIn')}
      </button>
    </form>
  );
}

interface AuthFieldProps {
  readonly autoComplete: string;
  readonly error: string | undefined;
  readonly hint?: string | undefined;
  readonly label: string;
  readonly name: 'displayName' | 'email' | 'password';
  readonly type: 'email' | 'password' | 'text';
}

function AuthField({
  autoComplete,
  error,
  hint,
  label,
  name,
  type,
}: AuthFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={`auth-field ${styles.field}`}>
      <label htmlFor={name}>{label}</label>
      <input
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={name}
        name={name}
        spellCheck={false}
        type={type}
      />
      {hint ? <p className={styles.hint} id={hintId}>{hint}</p> : null}
      {error ? (
        <p className={`field-error ${styles.fieldError}`} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
