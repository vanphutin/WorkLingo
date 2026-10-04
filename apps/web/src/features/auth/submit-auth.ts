import {
  authUserSchema,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@worklingo/contracts';

export async function submitAuth(
  mode: 'login' | 'register',
  input: LoginInput | RegisterInput,
): Promise<AuthUser> {
  const response = await fetch(`/api/v1/auth/${mode}`, {
    body: JSON.stringify(input),
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Authentication request failed with ${response.status}`);
  }

  return authUserSchema.parse(await response.json());
}
