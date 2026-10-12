import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AdminAuditEventDto,
  AdminAuditFilterInput,
  AdminAuditPageDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { sanitizeAuditState } from '../domain/audit-metadata-policy.js';

@Injectable()
export class AuditQueryService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  private encodeCursor(createdAt: string, id: string): string {
    return Buffer.from(JSON.stringify([createdAt, id])).toString('base64url');
  }

  private decodeCursor(cursor: string): [string, string] | null {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (Array.isArray(decoded) && decoded.length === 2 && typeof decoded[0] === 'string' && typeof decoded[1] === 'string') {
        return [decoded[0], decoded[1]];
      }
      return null;
    } catch {
      return null;
    }
  }

  async list(filters: AdminAuditFilterInput): Promise<AdminAuditPageDto> {
    const limit = Math.max(1, Math.min(100, filters.limit ?? 25));

    const where: Prisma.AuditLogWhereInput = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.from || filters.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }

    if (filters.cursor) {
      const decoded = this.decodeCursor(filters.cursor);
      if (decoded) {
        const [cursorDateIso, cursorId] = decoded;
        const cursorDate = new Date(cursorDateIso);
        where.AND = [
          {
            OR: [
              { createdAt: { lt: cursorDate } },
              { createdAt: cursorDate, id: { lt: cursorId } },
            ],
          },
        ];
      }
    }

    const rows = await this.database.auditLog.findMany({
      include: {
        actor: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      where,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items: AdminAuditEventDto[] = pageRows.map((row) => ({
      action: row.action,
      actorDisplayName: row.actor?.displayName ?? 'System',
      actorId: row.actorId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      metadata: sanitizeAuditState(row.metadata),
      newState: sanitizeAuditState(row.newState),
      oldState: sanitizeAuditState(row.oldState),
      resourceId: row.resourceId,
      resourceType: row.resourceType,
    }));

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1]!;
      nextCursor = this.encodeCursor(last.createdAt.toISOString(), last.id);
    }

    return {
      items,
      nextCursor,
    };
  }
}
