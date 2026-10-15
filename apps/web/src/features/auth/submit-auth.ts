import {
  authUserSchema,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@worklingo/contracts';
import { ApiError } from '../../lib/api/api-client';

export async function submitAuth(
  mode: 'login' | 'register',
  input: LoginInput | RegisterInput,
): Promise<AuthUser> {
  let response: Response;
  try { response = await fetch(`/api/v1/auth/${mode}`, {
    body: JSON.stringify(input),
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  }); } catch { throw new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'Authentication connection failed' }); }

  if (!response.ok) {
    throw new ApiError({ code: response.status === 401 ? 'UNAUTHORIZED' : response.status === 409 ? 'CONFLICT' : 'HTTP_ERROR', status: response.status, message: 'Authentication request failed' });
  }

  return authUserSchema.parse(await response.json());
}
