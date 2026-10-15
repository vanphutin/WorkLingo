import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/database/prisma.service.js';
import { UsersService, type UserWithProfile } from './users.service.js';

describe('UsersService locale preferences', () => {
  let service: UsersService;
  const profile = { findUnique: vi.fn(), upsert: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: { learnerProfile: profile } }],
    }).compile();
    service = module.get(UsersService);
  });

  it.each([
    { stored: { locale: 'en' }, expected: 'en' },
    { stored: { locale: 'vi' }, expected: 'vi' },
    { stored: { locale: 'en-US' }, expected: 'vi' },
    { stored: null, expected: 'vi' },
  ])('returns a supported locale for profile $stored', async ({ stored, expected }) => {
    profile.findUnique.mockResolvedValue(stored);
    await expect(service.getPreferences('current-user')).resolves.toEqual({ locale: expected });
    expect(profile.findUnique).toHaveBeenCalledWith({ where: { userId: 'current-user' }, select: { locale: true } });
    expect(profile.upsert).not.toHaveBeenCalled();
  });

  it('updates only locale for the authenticated owner and creates default profiles when missing', async () => {
    profile.upsert.mockResolvedValue({ locale: 'en' });
    await expect(service.updatePreferences('current-user', { locale: 'en' })).resolves.toEqual({ locale: 'en' });
    expect(profile.upsert).toHaveBeenCalledWith({
      where: { userId: 'current-user' }, create: { userId: 'current-user', locale: 'en' },
      update: { locale: 'en' }, select: { locale: true },
    });
  });

  it('returns a default locale in auth responses for an administrator without a profile', () => {
    const user: UserWithProfile = {
      id: '00000000-0000-4000-8000-000000000001', displayName: 'Administrator',
      email: 'admin@example.test', passwordHash: 'never-return-this', role: 'SYSTEM_ADMIN', status: 'ACTIVE',
      createdAt: new Date('2026-10-01T10:00:00Z'), updatedAt: new Date('2026-10-01T10:00:00Z'), profile: null,
    };
    expect(service.toAuthUser(user)).toEqual({
      id: user.id, displayName: 'Administrator', email: 'admin@example.test', locale: 'vi',
      onboardingStatus: null, roles: ['SYSTEM_ADMIN'],
    });
  });
});
