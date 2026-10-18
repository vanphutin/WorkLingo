import 'reflect-metadata';
import { type ExecutionContext, ForbiddenException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from '../auth/infrastructure/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AdminContentLifecycleController } from './admin-content-lifecycle.controller.js';
import { AdminContentLifecycleService } from './admin-content-lifecycle.service.js';
import { RemoveAdminContentDto, RemoveAdminContentParamsDto } from './dto/remove-admin-content.dto.js';

const id = '22222222-2222-4222-8222-222222222222';
const input = { expectedRevision: 1, expectedAction: 'deleted' as const, idempotencyKey: '33333333-3333-4333-8333-333333333333' };
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

describe('AdminContentLifecycleController', () => {
  it('exposes the agreed POST route', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminContentLifecycleController)).toBe('admin/content-lifecycle');
    expect(Reflect.getMetadata(PATH_METADATA, AdminContentLifecycleController.prototype.remove)).toBe(':kind/:id/remove');
    expect(Reflect.getMetadata(METHOD_METADATA, AdminContentLifecycleController.prototype.remove)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata('design:paramtypes', AdminContentLifecycleController.prototype, 'remove')?.slice(1)).toEqual([RemoveAdminContentParamsDto, RemoveAdminContentDto]);
  });
  it.each(['topic', 'bridge', 'mock', 'lesson'] as const)('passes %s and the authenticated actor to the service', async kind => {
    const service = { remove: vi.fn().mockResolvedValue({ id, action: 'deleted' }) };
    const module = await Test.createTestingModule({ controllers: [AdminContentLifecycleController], providers: [{ provide: AdminContentLifecycleService, useValue: service }] }).compile();
    const req = { authUser: { id: 'actor' } } as AuthenticatedRequest;
    await expect(module.get(AdminContentLifecycleController).remove(req, { kind, id }, input)).resolves.toEqual({ id, action: 'deleted' });
    expect(service.remove).toHaveBeenCalledWith('actor', kind, id, input);
  });
  it.each(['CONTENT_ADMIN', 'SYSTEM_ADMIN', 'LEARNER', 'TEACHER'])('enforces role %s using the real role guard', role => {
    const guard = new RolesGuard(new Reflector());
    const context = { getHandler: () => AdminContentLifecycleController.prototype.remove, getClass: () => AdminContentLifecycleController, switchToHttp: () => ({ getRequest: () => ({ authUser: { roles: [role] } }) }) } as unknown as ExecutionContext;
    if (role.endsWith('ADMIN')) expect(guard.canActivate(context)).toBe(true);
    else expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
  it.each([{ ...input, expectedRevision: 0 }, { ...input, expectedRevision: 1.5 }, { ...input, expectedRevision: '1' }, { ...input, idempotencyKey: 'bad' }, { ...input, extra: true }])('rejects invalid removal input %j', async value => {
    await expect(pipe.transform(value, { type: 'body', metatype: RemoveAdminContentDto })).rejects.toThrow();
  });
  it('validates kind and target UUID', async () => {
    await expect(pipe.transform({ kind: 'topic', id }, { type: 'param', metatype: RemoveAdminContentParamsDto })).resolves.toMatchObject({ kind: 'topic', id });
    await expect(pipe.transform({ kind: 'orientation', id }, { type: 'param', metatype: RemoveAdminContentParamsDto })).rejects.toThrow();
    await expect(pipe.transform({ kind: 'lesson', id: 'bad' }, { type: 'param', metatype: RemoveAdminContentParamsDto })).rejects.toThrow();
  });
  it('requires a valid expected action in the confirmation', async () => {
    const { expectedAction: _expectedAction, ...missingAction } = input;
    await expect(pipe.transform(input, { type: 'body', metatype: RemoveAdminContentDto })).resolves.toMatchObject(input);
    await expect(pipe.transform(missingAction, { type: 'body', metatype: RemoveAdminContentDto })).rejects.toThrow();
    await expect(pipe.transform({ ...input, expectedAction: 'delete' }, { type: 'body', metatype: RemoveAdminContentDto })).rejects.toThrow();
  });
});
