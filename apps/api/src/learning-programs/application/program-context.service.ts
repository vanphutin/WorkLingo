import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { activateProgramSchema, programContextSchema, type ActivateProgramInput, type ProgramContextDto } from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { deriveProgramAccess } from '../domain/program-availability.js';
import { INTERMEDIATE_PROGRAM_ID } from '../domain/program-catalog.js';

export interface ResolvedProgramContext {
  programId: string;
  programSlug: string;
  enrollmentId: string;
  revision: number;
  levelId: string;
  levelCode: string;
}

@Injectable()
export class ProgramContextService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async getContext(learnerId: string): Promise<ProgramContextDto> {
    return this.database.$transaction((tx) => this.readContext(tx, learnerId), { isolationLevel: 'RepeatableRead' });
  }

  async resolve(learnerId: string, transaction?: Prisma.TransactionClient): Promise<ResolvedProgramContext> {
    if (!transaction) return this.database.$transaction((tx) => this.resolve(learnerId, tx), { isolationLevel: 'RepeatableRead' });
    const context = await this.readContext(transaction, learnerId);
    if (!context.activeProgram || !context.enrollment?.currentLevel) {
      throw new ConflictException({ code: 'ONBOARDING_REQUIRED', message: 'Complete onboarding before learning.' });
    }
    return {
      programId: context.activeProgram.id, programSlug: context.activeProgram.slug,
      enrollmentId: context.enrollment.id, revision: context.enrollment.revision,
      levelId: context.enrollment.currentLevel.id, levelCode: context.enrollment.currentLevel.code,
    };
  }

  async activate(learnerId: string, input: ActivateProgramInput): Promise<ProgramContextDto> {
    const parsed = activateProgramSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid program activation input.');
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId" = ${learnerId}::uuid FOR UPDATE`;
      const profile = await tx.learnerProfile.findUnique({ where: { userId: learnerId } });
      if (!profile) throw new NotFoundException('Learner profile not found');
      if (profile.onboardingStatus !== 'COMPLETE') {
        throw new ConflictException({ code: 'ONBOARDING_REQUIRED', message: 'Complete onboarding before choosing a program.' });
      }
      const target = await tx.learningProgram.findUnique({ where: { slug: parsed.data.programSlug } });
      if (!target || target.availabilityStatus === 'DISABLED') {
        throw new NotFoundException({ code: 'PROGRAM_NOT_FOUND', message: 'Learning program not found.' });
      }
      // IELTS is guided navigation over Intermediate evidence, never a generic level context.
      if (target.slug === 'ielts' || !deriveProgramAccess(target).isSelectable) {
        throw new UnprocessableEntityException({ code: 'PROGRAM_UNAVAILABLE', message: 'This learning program is not available yet.' });
      }
      const current = await this.resolve(learnerId, tx);
      if (parsed.data.expectedRevision !== current.revision) {
        throw new ConflictException({ code: 'PROGRAM_CONTEXT_STALE', message: 'Learning context changed. Refresh before retrying.' });
      }
      if (target.id === current.programId) return this.readContext(tx, learnerId);
      const enrollment = await tx.learnerProgramEnrollment.findUnique({
        where: { learnerId_programId: { learnerId, programId: target.id } },
        include: { currentLevel: { include: { path: true } } },
      });
      if (!enrollment?.currentLevel || enrollment.currentLevel.path.programId !== target.id) throw this.invalidContext();
      // The new active revision is higher than both contexts, so switching cannot reuse an old token.
      await tx.learnerProgramEnrollment.update({ where: { id: enrollment.id }, data: {
        revision: Math.max(current.revision, enrollment.revision) + 1,
      } });
      await tx.learnerProfile.update({ where: { userId: learnerId }, data: { activeProgramId: target.id } });
      await tx.auditLog.create({ data: {
        actorId: learnerId, action: 'program.context.activated', resourceType: 'LearnerProgramEnrollment', resourceId: enrollment.id,
        metadata: { programId: target.id, enrollmentId: enrollment.id, revision: Math.max(current.revision, enrollment.revision) + 1 },
      } });
      return this.readContext(tx, learnerId);
    }, { timeout: 15_000 });
  }

  async initializeIntermediate(transaction: Prisma.TransactionClient, learnerId: string, levelCode: string): Promise<void> {
    const level = await transaction.level.findUnique({ where: { code: levelCode }, include: { path: true } });
    if (!level || level.path.programId !== INTERMEDIATE_PROGRAM_ID) throw this.invalidContext();
    const enrollment = await transaction.learnerProgramEnrollment.upsert({
      where: { learnerId_programId: { learnerId, programId: INTERMEDIATE_PROGRAM_ID } },
      create: { learnerId, programId: INTERMEDIATE_PROGRAM_ID, currentLevelId: level.id },
      update: {},
    });
    if (enrollment.currentLevelId !== level.id) throw this.invalidContext();
    await transaction.learnerProfile.update({ where: { userId: learnerId }, data: { activeProgramId: INTERMEDIATE_PROGRAM_ID } });
  }

  private async readContext(database: Prisma.TransactionClient, learnerId: string): Promise<ProgramContextDto> {
    const profile = await database.learnerProfile.findUnique({ where: { userId: learnerId }, include: { activeProgram: true } });
    if (!profile) throw new NotFoundException('Learner profile not found');
    if (profile.onboardingStatus === 'PENDING') return { activeProgram: null, enrollment: null };
    if (!profile.activeProgram) throw this.invalidContext();
    const enrollment = await database.learnerProgramEnrollment.findUnique({
      where: { learnerId_programId: { learnerId, programId: profile.activeProgram.id } },
      include: { currentLevel: { include: { path: true } } },
    });
    if (!enrollment?.currentLevel || enrollment.currentLevel.path.programId !== profile.activeProgram.id) throw this.invalidContext();
    return programContextSchema.parse({
      activeProgram: { id: profile.activeProgram.id, slug: profile.activeProgram.slug, name: profile.activeProgram.name },
      enrollment: { id: enrollment.id, revision: enrollment.revision, currentLevel: {
        id: enrollment.currentLevel.id, code: enrollment.currentLevel.code, name: enrollment.currentLevel.name,
      } },
    });
  }

  private invalidContext() {
    return new ConflictException({ code: 'PROGRAM_CONTEXT_INVALID', message: 'Learning program enrollment is inconsistent.' });
  }
}
