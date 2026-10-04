import type { Request } from 'express';

import type { AuthUser } from '@worklingo/contracts';

export interface AuthenticatedRequest extends Request {
  authSessionToken: string;
  authUser: AuthUser;
}
