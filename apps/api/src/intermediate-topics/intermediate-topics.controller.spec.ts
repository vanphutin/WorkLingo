import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import { IntermediateTopicReviewController } from './intermediate-topics.controller.js';

describe('Topic human approval RBAC boundary', () => {
  it.each(['LEARNER', 'SUPPORT', 'CONTENT_ADMIN', 'SYSTEM_ADMIN'])('checks %s against the actual approval controller metadata', role => {
    const context = { getHandler: () => IntermediateTopicReviewController.prototype.approve, getClass: () => IntermediateTopicReviewController,
      switchToHttp: () => ({ getRequest: () => ({ authUser: { roles: [role] } }) }) } as unknown as ExecutionContext;
    const guard = new RolesGuard(new Reflector());
    if (role === 'CONTENT_ADMIN' || role === 'SYSTEM_ADMIN') expect(guard.canActivate(context)).toBe(true);
    else expect(() => guard.canActivate(context)).toThrow();
  });
});
