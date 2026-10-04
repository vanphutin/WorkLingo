import '@testing-library/jest-dom/vitest';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@worklingo/contracts';

import { AuthForm } from './auth-form';

const learner: AuthUser = {
  displayName: 'An Nguyen',
  email: 'an@example.com',
  id: '828a1927-c4fa-487f-93d5-96c556667869',
  roles: ['LEARNER'],
};

afterEach(cleanup);

describe('AuthForm', () => {
  it('renders accessible registration fields and validation messages', async () => {
    render(
      <AuthForm
        mode="register"
        onAuthenticated={() => undefined}
        submit={async () => learner}
      />,
    );

    expect(screen.getByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findAllByRole('alert')).toHaveLength(3);
  });

  it('disables submission while the request is pending', async () => {
    let resolveRequest: ((user: AuthUser) => void) | undefined;
    const pendingRequest = new Promise<AuthUser>((resolve) => {
      resolveRequest = resolve;
    });

    render(
      <AuthForm
        mode="login"
        onAuthenticated={() => undefined}
        submit={() => pendingRequest}
      />,
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'an@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a-secure-local-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();

    resolveRequest?.(learner);
    await waitFor(() =>
      expect(screen.getByText('Opening your dashboard…')).toBeInTheDocument(),
    );
  });

  it('shows a generic login error without exposing server details', async () => {
    render(
      <AuthForm
        mode="login"
        onAuthenticated={() => undefined}
        submit={async () => {
          throw new Error('database connection details');
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'an@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password-value' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      await screen.findByText('Email or password is invalid.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/database connection/iu)).not.toBeInTheDocument();
  });

  it('notifies the page after successful authentication', async () => {
    const onAuthenticated = vi.fn();
    render(
      <AuthForm
        mode="login"
        onAuthenticated={onAuthenticated}
        submit={async () => learner}
      />,
    );
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'an@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a-secure-local-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(learner));
  });
});
