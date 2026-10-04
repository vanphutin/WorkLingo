import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import type { AuthUser } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service';

interface CreateLearnerInput {
  readonly displayName: string;
  readonly email: string;
  readonly passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  createLearner(input: CreateLearnerInput): Promise<User> {
    return this.database.user.create({
      data: {
        displayName: input.displayName,
        email: input.email,
        passwordHash: input.passwordHash,
        profile: { create: {} },
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { email } });
  }

  toAuthUser(user: User): AuthUser {
    return {
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      roles: [user.role],
    };
  }
}
