import { createHmac, randomBytes } from 'node:crypto';

import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import type {
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@worklingo/contracts';

import type { AppConfig } from '../../common/config/app-config.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { UsersService } from '../../users/application/users.service';
import { SESSION_DURATION_MS } from '../auth.constants';
import { PasswordHasher } from '../infrastructure/password-hasher';

interface AuthResult {
  readonly sessionToken: string;
  readonly user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly sessionSecret: string;

  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(ConfigService) config: ConfigService<AppConfig, true>,
  ) {
    this.sessionSecret = config.get('sessionSecret', { infer: true });
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.passwordHasher.hash(input.password);

    try {
      const user = await this.users.createLearner({
        displayName: input.displayName.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash,
      });
      return this.createAuthenticatedSession(this.users.toAuthUser(user));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());

    if (!user) {
      await this.passwordHasher.hash(input.password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );
    if (!passwordMatches || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthenticatedSession(this.users.toAuthUser(user));
  }

  async authenticate(sessionToken: string): Promise<AuthUser> {
    const session = await this.database.userSession.findUnique({
      include: { user: true },
      where: { tokenHash: this.hashSessionToken(sessionToken) },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.users.toAuthUser(session.user);
  }

  async logout(sessionToken: string): Promise<void> {
    await this.database.userSession.updateMany({
      data: { revokedAt: new Date() },
      where: {
        revokedAt: null,
        tokenHash: this.hashSessionToken(sessionToken),
      },
    });
  }

  private async createAuthenticatedSession(user: AuthUser): Promise<AuthResult> {
    const sessionToken = randomBytes(32).toString('base64url');
    await this.database.userSession.create({
      data: {
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        tokenHash: this.hashSessionToken(sessionToken),
        userId: user.id,
      },
    });

    return { sessionToken, user };
  }

  private hashSessionToken(sessionToken: string): string {
    return createHmac('sha256', this.sessionSecret)
      .update(sessionToken)
      .digest('hex');
  }
}
