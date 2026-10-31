import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma, LearnerProgramEnrollment } from '@prisma/client';
import { assignProgramEnrollmentSchema, enrollProgramSchema, withdrawProgramEnrollmentSchema, enrollmentHistorySchema, programContextSchema, programEnrollmentListSchema, programEnrollmentSchema, programEnrollmentTransitionSchema, programPageSchema, programVersionInputSchema, type ProgramEnrollmentDto, type ProgramEnrollmentStatus } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { deriveProgramAccess } from '../domain/program-availability.js';
import { jsonValue, lockProgram, parseProgramInput, programAudit, programCommand, requireProgramActor } from './program-command.js';
export function enrollmentDto(row: LearnerProgramEnrollment): ProgramEnrollmentDto {
  return programEnrollmentSchema.parse({ id: row.id, learnerId: row.learnerId, programId: row.programId, programVersionId: row.programVersionId, status: row.status, revision: row.revision, currentLevelId: row.currentLevelId, curriculumRevisionIds: row.curriculumRevisionIds, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
const transitions: Record<ProgramEnrollmentStatus, ProgramEnrollmentStatus[]> = { ACTIVE: ['SUSPENDED', 'WITHDRAWN', 'COMPLETED'], SUSPENDED: ['ACTIVE', 'WITHDRAWN'], COMPLETED: ['ACTIVE'], WITHDRAWN: ['ACTIVE'] };
@Injectable()
export class ProgramEnrollmentsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}
  async assign(actorId: string, programId: string, raw: unknown) {
    const input = parseProgramInput(assignProgramEnrollmentSchema, raw);
    return programCommand(this.database, actorId, 'enrollments.assign', input.idempotencyKey, { programId, input }, async tx => {
      await this.lockLearner(tx, input.learnerId);
      const program = await lockProgram(tx, programId, input.expectedRevision);
      return enrollmentDto(await this.assignInTransaction(tx, actorId, input.learnerId, program, input.programVersionId));
    });
  }
  async enrollSelf(actorId: string, programSlug: string, expectedRevision: number, idempotencyKey: string) {
    const validated = parseProgramInput(enrollProgramSchema, { programSlug, expectedRevision, idempotencyKey });
    programSlug = validated.programSlug;
    idempotencyKey = validated.idempotencyKey!;
    return programCommand(this.database, actorId, 'enrollments.self', idempotencyKey, { programSlug, expectedRevision }, async tx => {
      const profile = await this.lockLearner(tx, actorId);
      const target = await tx.learningProgram.findUnique({ where: { slug: programSlug } });
      if (!target) throw new NotFoundException('Program not found');
      const program = await lockProgram(tx, target.id);
      const current = profile.activeProgramId ? await tx.learnerProgramEnrollment.findUnique({ where: { learnerId_programId: { learnerId: actorId, programId: profile.activeProgramId } } }) : null;
      const existing = await tx.learnerProgramEnrollment.findUnique({ where: { learnerId_programId: { learnerId: actorId, programId: program.id } } });
      if (existing && existing.status !== 'ACTIVE') throw new ConflictException('PROGRAM_ENROLLMENT_REACTIVATION_REQUIRED');
      // A repeated self-enrollment never silently upgrades an existing enrollment.
      if (existing && current?.id === existing.id) {
        if (current.revision !== expectedRevision) throw new ConflictException('PROGRAM_CONTEXT_STALE');
        return this.context(tx, existing, program);
      }
      if (!current || current.status !== 'ACTIVE' || current.revision !== expectedRevision) throw new ConflictException('PROGRAM_CONTEXT_STALE');
      const release = await tx.programVersion.findFirst({ where: { programId: program.id, status: 'PUBLISHED', source: 'AUTHORED' }, orderBy: { version: 'desc' } });
      if (!release && !existing) throw new UnprocessableEntityException('PROGRAM_RELEASE_UNAVAILABLE');
      const enrollment = existing ?? await this.assignInTransaction(tx, actorId, actorId, program, release!.id);
      const activated = await tx.learnerProgramEnrollment.update({ where: { id: enrollment.id }, data: { revision: Math.max(current.revision, enrollment.revision) + 1 } });
      await tx.learnerProfile.update({ where: { userId: actorId }, data: { activeProgramId: program.id } });
      await this.event(tx, actorId, 'ACTIVATED', 'Learner selected enrolled program', enrollment, activated);
      return this.context(tx, activated, program);
    }, false);
  }
  async transition(actorId: string, programId: string, enrollmentId: string, raw: unknown, owned = false) {
    const input = parseProgramInput(programEnrollmentTransitionSchema, raw);
    return programCommand(this.database, actorId, 'enrollments.transition', input.idempotencyKey, { programId, enrollmentId, input, owned }, async tx => {
      const target = await tx.learnerProgramEnrollment.findUnique({ where: { id: enrollmentId } });
      if (!target || target.programId !== programId || (owned && target.learnerId !== actorId)) throw new NotFoundException('Enrollment not found');
      if (owned && input.targetStatus !== 'WITHDRAWN') throw new ForbiddenException('PROGRAM_FORBIDDEN');
      await this.lockLearnerRows(tx, target.learnerId);
      await lockProgram(tx, programId);
      await tx.$queryRaw`SELECT "id" FROM "LearnerProgramEnrollment" WHERE "id"=${enrollmentId}::uuid FOR UPDATE`;
      const current = await tx.learnerProgramEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
      if (current.revision !== input.expectedRevision) throw new ConflictException('PROGRAM_ENROLLMENT_REVISION_STALE');
      if (!transitions[current.status].includes(input.targetStatus)) throw new ConflictException('PROGRAM_ENROLLMENT_INVALID_TRANSITION');
      if (input.targetStatus === 'COMPLETED') {
        const version = current.programVersionId ? await tx.programVersion.findUnique({ where: { id: current.programVersionId } }) : null;
        if (!version || version.source !== 'AUTHORED') throw new UnprocessableEntityException('PROGRAM_COMPLETION_EVIDENCE_REQUIRED');
        const snapshot = programVersionInputSchema.parse(version.snapshot);
        const required = snapshot.curriculumBindings.filter(binding => binding.required).map(binding => binding.curriculumRevisionId);
        if (await tx.curriculumCompletion.count({ where: { enrollmentId, curriculumRevisionId: { in: required } } }) !== required.length) throw new UnprocessableEntityException('PROGRAM_COMPLETION_EVIDENCE_REQUIRED');
      }
      const updated = await tx.learnerProgramEnrollment.update({ where: { id: enrollmentId }, data: { status: input.targetStatus, revision: { increment: 1 } } });
      await this.event(tx, actorId, input.targetStatus, input.reason, current, updated);
      return enrollmentDto(updated);
    }, !owned);
  }
  async withdraw(actorId: string, enrollmentId: string, raw: unknown) {
    const input = parseProgramInput(withdrawProgramEnrollmentSchema, raw);
    const row = await this.database.learnerProgramEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!row || row.learnerId !== actorId) throw new NotFoundException('Enrollment not found');
    return this.transition(actorId, row.programId, enrollmentId, { ...input, targetStatus: 'WITHDRAWN' }, true);
  }
  async listMine(actorId: string, raw: unknown = {}) {
    return this.list(actorId, undefined, raw, true);
  }
  async listAdmin(actorId: string, programId: string, raw: unknown = {}) {
    return this.list(actorId, programId, raw, false);
  }
  private async list(actorId: string, programId: string | undefined, raw: unknown, owned: boolean) {
    const page = parseProgramInput(programPageSchema, raw);
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId, !owned);
      const where = owned ? { learnerId: actorId } : { programId: programId! };
      if (!owned) await lockProgram(tx, programId!);
      const [items, total] = await Promise.all([tx.learnerProgramEnrollment.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (page.page - 1) * page.limit, take: page.limit }), tx.learnerProgramEnrollment.count({ where })]);
      return programEnrollmentListSchema.parse({ items: items.map(enrollmentDto), total, page: page.page, limit: page.limit });
    });
  }
  async history(actorId: string, programId: string, enrollmentId: string, raw: unknown = {}, owned = false) {
    const page = parseProgramInput(programPageSchema, raw);
    return this.database.$transaction(async tx => {
      await requireProgramActor(tx, actorId, !owned);
      const target = await tx.learnerProgramEnrollment.findUnique({ where: { id: enrollmentId } });
      if (!target || target.programId !== programId || (owned && target.learnerId !== actorId)) throw new NotFoundException('Enrollment not found');
      const [items, total] = await Promise.all([tx.enrollmentEvent.findMany({ where: { enrollmentId }, orderBy: { revision: 'asc' }, skip: (page.page - 1) * page.limit, take: page.limit }), tx.enrollmentEvent.count({ where: { enrollmentId } })]);
      return enrollmentHistorySchema.parse({ items: items.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })), total, page: page.page, limit: page.limit });
    });
  }
  private async lockLearnerRows(tx: Prisma.TransactionClient, learnerId: string) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${learnerId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT "userId" FROM "LearnerProfile" WHERE "userId"=${learnerId}::uuid FOR UPDATE`;
  }
  private async lockLearner(tx: Prisma.TransactionClient, learnerId: string) {
    await this.lockLearnerRows(tx, learnerId);
    const learner = await tx.user.findUnique({ where: { id: learnerId } });
    if (!learner || learner.role !== 'LEARNER' || learner.status !== 'ACTIVE') throw new UnprocessableEntityException('PROGRAM_LEARNER_INELIGIBLE');
    const profile = await tx.learnerProfile.findUnique({ where: { userId: learnerId } });
    if (!profile || profile.onboardingStatus !== 'COMPLETE') throw new ConflictException('ONBOARDING_REQUIRED');
    return profile;
  }
  private async assignInTransaction(tx: Prisma.TransactionClient, actorId: string, learnerId: string, program: Awaited<ReturnType<typeof lockProgram>>, versionId: string) {
    if (!deriveProgramAccess(program).isSelectable) throw new UnprocessableEntityException('PROGRAM_UNAVAILABLE');
    const release = await tx.programVersion.findUnique({ where: { id: versionId } });
    if (!release || release.programId !== program.id || release.status !== 'PUBLISHED' || release.source !== 'AUTHORED') throw new UnprocessableEntityException('PROGRAM_RELEASE_UNAVAILABLE');
    const existing = await tx.learnerProgramEnrollment.findUnique({ where: { learnerId_programId: { learnerId, programId: program.id } } });
    if (existing) {
      if (existing.programVersionId !== versionId) throw new ConflictException('PROGRAM_ENROLLMENT_VERSION_MISMATCH');
      if (existing.status !== 'ACTIVE') throw new ConflictException('PROGRAM_ENROLLMENT_REACTIVATION_REQUIRED');
      return existing;
    }
    const snapshot = programVersionInputSchema.parse(release.snapshot);
    const enrollment = await tx.learnerProgramEnrollment.create({ data: { learnerId, programId: program.id, programVersionId: release.id, currentLevelId: snapshot.curriculumBindings[0]!.levelId, curriculumRevisionIds: release.curriculumRevisionIds } });
    await this.event(tx, actorId, 'ASSIGNED', actorId === learnerId ? 'Learner self-enrollment' : 'Administrator assignment', null, enrollment);
    return enrollment;
  }
  private async event(tx: Prisma.TransactionClient, actorId: string, type: string, reason: string, previous: LearnerProgramEnrollment | null, next: LearnerProgramEnrollment) {
    const currentDto = enrollmentDto(next);
    await tx.enrollmentEvent.create({ data: { enrollmentId: next.id, actorId, type, reason, revision: next.revision, ...(previous ? { previousState: jsonValue(enrollmentDto(previous)) } : {}), nextState: jsonValue(currentDto) } });
    await programAudit(tx, actorId, `program.enrollment.${type.toLowerCase()}`, 'LearnerProgramEnrollment', next.id, { reason, previous: previous ? enrollmentDto(previous) : null, next: currentDto });
  }
  private async context(tx: Prisma.TransactionClient, enrollment: LearnerProgramEnrollment, program: Awaited<ReturnType<typeof lockProgram>>) {
    const level = enrollment.currentLevelId ? await tx.level.findUnique({ where: { id: enrollment.currentLevelId } }) : null;
    const release = enrollment.programVersionId ? await tx.programVersion.findUnique({ where: { id: enrollment.programVersionId } }) : null;
    if (!level) throw new ConflictException('PROGRAM_CONTEXT_INVALID');
    return programContextSchema.parse({ activeProgram: { id: program.id, slug: program.slug, name: (release?.snapshot as { title?: string } | undefined)?.title ?? program.name }, enrollment: { id: enrollment.id, revision: enrollment.revision, currentLevel: { id: level.id, code: level.code, name: level.name } } });
  }
}
