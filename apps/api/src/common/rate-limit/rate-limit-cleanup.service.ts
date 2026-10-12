import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class RateLimitCleanupService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async cleanupExpiredBuckets(olderThanSeconds = 86400): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000);
    const result = await this.prisma.rateLimitBucket.deleteMany({
      where: {
        windowStart: {
          lt: cutoff,
        },
      },
    });
    return result.count;
  }
}
