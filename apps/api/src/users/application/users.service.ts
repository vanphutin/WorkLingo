import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { uiLocaleSchema, type AuthUser, type UiLocale, type UserPreferences } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service';

interface CreateLearnerInput {
  readonly displayName: string;
  readonly email: string;
  readonly locale?: UiLocale;
  readonly passwordHash: string;
}

export type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  createLearner(input: CreateLearnerInput): Promise<UserWithProfile> {
    return this.database.user.create({
      data: {
        displayName: input.displayName,
        email: input.email,
        passwordHash: input.passwordHash,
        profile: { create: { locale: input.locale ?? 'vi' } },
      },
      include: { profile: true },
    });
  }

  findByEmail(email: string): Promise<UserWithProfile | null> {
    return this.database.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const profile = await this.database.learnerProfile.findUnique({
      where: { userId },
      select: { locale: true },
    });
    return { locale: this.validatedLocale(profile?.locale) };
  }

  async updatePreferences(userId: string, input: UserPreferences): Promise<UserPreferences> {
    const profile = await this.database.learnerProfile.upsert({
      where: { userId },
      create: { userId, locale: input.locale },
      update: { locale: input.locale },
      select: { locale: true },
    });
    return { locale: this.validatedLocale(profile.locale) };
  }

  toAuthUser(user: UserWithProfile): AuthUser {
    return {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      locale: this.validatedLocale(user.profile?.locale),
      onboardingStatus: user.role === 'LEARNER'
        ? (user.profile?.onboardingStatus ?? 'PENDING')
        : null,
      roles: [user.role],
    };
  }

  private validatedLocale(locale: string | undefined): UiLocale {
    const result = uiLocaleSchema.safeParse(locale);
    return result.success ? result.data : 'vi';
  }
}
