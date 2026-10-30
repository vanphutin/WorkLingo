import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { reservedProgramSlugs } from '@worklingo/contracts';
import type { z } from 'zod';
import type { PrismaService } from '../../common/database/prisma.service.js';

export function parseProgramInput<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new BadRequestException('INVALID_PROGRAM_COMMAND');
  return result.data;
}
export async function requireProgramActor(tx: Prisma.TransactionClient, actorId: string, admin = true, lock = true) {
  if (lock) await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${actorId}::uuid FOR UPDATE`;
  const actor = await tx.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.status !== 'ACTIVE' || (admin ? !['CONTENT_ADMIN', 'SYSTEM_ADMIN'].includes(actor.role) : actor.role !== 'LEARNER')) throw new ForbiddenException('PROGRAM_FORBIDDEN');
  return actor;
}
export async function lockProgram(tx: Prisma.TransactionClient, programId: string, expectedRevision?: number) {
  await tx.$queryRaw`SELECT "id" FROM "LearningProgram" WHERE "id"=${programId}::uuid FOR UPDATE`;
  const row = await tx.learningProgram.findUnique({ where: { id: programId } });
  if (!row) throw new NotFoundException('Program not found');
  if (reservedProgramSlugs.some(slug => slug === row.slug) || row.progressionPolicy !== 'ACTIVITY_COMPLETION') throw new UnprocessableEntityException('PROGRAM_RESERVED');
  if (expectedRevision !== undefined && row.revision !== expectedRevision) throw new ConflictException('PROGRAM_REVISION_STALE');
  return row;
}
export function jsonValue(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
export async function programCommand<T>(database: PrismaService, actorId: string, action: string, key: string, payload: unknown, execute: (tx: Prisma.TransactionClient) => Promise<T>, admin = true): Promise<T> {
  const operation = `program:${action}`;
  const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  try {
    return await database.$transaction(async tx => {
      await requireProgramActor(tx, actorId, admin);
      const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: key } } });
      if (receipt) {
        if (receipt.requestHash !== requestHash) throw new ConflictException('IDEMPOTENCY_CONFLICT');
        return receipt.responseBody as T;
      }
      const result = await execute(tx);
      const responseStatus = ['versions.create', 'enrollments.assign', 'duplicate'].includes(action) ? 201 : 200;
      await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: key, requestHash, responseStatus, responseBody: jsonValue(result) } });
      return result;
    }, { timeout: 30_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new ConflictException('PROGRAM_CONFLICT');
    throw error;
  }
}
export async function programAudit(tx: Prisma.TransactionClient, actorId: string, action: string, resourceType: string, resourceId: string, metadata: unknown) {
  await tx.auditLog.create({ data: { actorId, action, resourceType, resourceId, metadata: jsonValue(metadata) } });
}
