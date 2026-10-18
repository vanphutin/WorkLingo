import 'reflect-metadata';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { Test } from '@nestjs/testing';
import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { IeltsMockAdminController } from './ielts-mock-admin.controller.js';
import { IeltsMockAdminService } from './application/ielts-mock-admin.service.js';
import { CreateIeltsMockDto } from './dto/ielts-mock-admin.dto.js';

describe('IeltsMockAdminController create', () => {
  it('exposes guarded POST /admin/ielts-mocks and delegates the actor and content', async () => {
    const input = { idempotencyKey: crypto.randomUUID(), content: INITIAL_IELTS_ACADEMIC_MOCK };
    const mocks = { create: vi.fn().mockResolvedValue({ id: 'created' }) };
    const module = await Test.createTestingModule({ controllers: [IeltsMockAdminController], providers: [{ provide: IeltsMockAdminService, useValue: mocks }] }).compile();
    const controller = module.get(IeltsMockAdminController);
    expect(Reflect.getMetadata(PATH_METADATA, IeltsMockAdminController)).toBe('admin/ielts-mocks');
    expect(Reflect.getMetadata(METHOD_METADATA, controller.create)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, controller.create)).toBe('/');
    expect(Reflect.getMetadata(ROLES_KEY, IeltsMockAdminController)).toEqual(['CONTENT_ADMIN', 'SYSTEM_ADMIN']);
    await expect(controller.create({ authUser: { id: 'actor' } } as AuthenticatedRequest, input)).resolves.toEqual({ id: 'created' });
    expect(mocks.create).toHaveBeenCalledWith('actor', input);
    expect(Reflect.getMetadata('design:paramtypes', IeltsMockAdminController.prototype, 'create')?.[1]).toBe(CreateIeltsMockDto);
  });
  it('validates UUID keys and object content without requiring an existing revision', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const input = { idempotencyKey: crypto.randomUUID(), content: INITIAL_IELTS_ACADEMIC_MOCK };
    await expect(pipe.transform(input, { type: 'body', metatype: CreateIeltsMockDto })).resolves.toMatchObject(input);
    await expect(pipe.transform({ ...input, idempotencyKey: 'bad' }, { type: 'body', metatype: CreateIeltsMockDto })).rejects.toThrow();
    await expect(pipe.transform({ ...input, content: [] }, { type: 'body', metatype: CreateIeltsMockDto })).rejects.toThrow();
  });
});
