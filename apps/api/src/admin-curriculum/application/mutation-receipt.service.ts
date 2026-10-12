import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service.js';

@Injectable()
export class MutationReceiptService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  computeHash(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async checkReceipt<T>(
    actorId: string,
    operation: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<T | null> {
    const existing = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId,
          idempotencyKey,
          operation,
        },
      },
    });

    if (!existing) {
      return null;
    }

    if (existing.requestHash !== requestHash) {
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key reused with different request payload',
        statusCode: 409,
      });
    }

    return existing.responseBody as unknown as T;
  }

  async recordReceipt(
    tx: Prisma.TransactionClient,
    actorId: string,
    operation: string,
    idempotencyKey: string,
    requestHash: string,
    responseBody: unknown,
    responseStatus = 200,
  ): Promise<void> {
    await tx.mutationReceipt.create({
      data: {
        actorId,
        idempotencyKey,
        operation,
        requestHash,
        responseBody: responseBody as Prisma.InputJsonValue,
        responseStatus,
      },
    });
  }
}
