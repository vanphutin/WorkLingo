import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { AuthUser } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service';

interface CreateLearnerInput {
  readonly displayName: string;
  readonly email: string;
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
        profile: { create: {} },
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

  toAuthUser(user: UserWithProfile): AuthUser {
    return {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      onboardingStatus: user.role === 'LEARNER'
        ? (user.profile?.onboardingStatus ?? 'PENDING')
        : null,
      roles: [user.role],
    };
  }
}
