import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../common/database/prisma.service.js';
import { buildPilotMetric, type PilotMetricInput } from '../domain/pilot-metric.js';

type MetricDatabase = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PilotMetricsService {
  constructor(
    @Inject(PrismaService)
    private readonly database: PrismaService,
  ) {}

  async record(
    input: PilotMetricInput,
    transaction?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const metric = buildPilotMetric(input);
    const persist = async (database: MetricDatabase): Promise<boolean> => {
      const receipt = await database.pilotMetricReceipt.createMany({
        data: [{ eventType: metric.eventType, sourceHash: metric.sourceHash }],
        skipDuplicates: true,
      });
      if (receipt.count === 0) {
        return false;
      }

      await database.pilotMetricDaily.upsert({
        create: {
          count: 1,
          dateKey: metric.dateKey,
          dimensionKey: metric.dimensionKey,
          dimensions: metric.dimensions,
          eventType: metric.eventType,
        },
        update: { count: { increment: 1 } },
        where: {
          dateKey_eventType_dimensionKey: {
            dateKey: metric.dateKey,
            dimensionKey: metric.dimensionKey,
            eventType: metric.eventType,
          },
        },
      });
      return true;
    };

    return transaction
      ? persist(transaction)
      : this.database.$transaction((tx) => persist(tx));
  }

  async recordBestEffort(input: PilotMetricInput): Promise<boolean> {
    try {
      return await this.record(input);
    } catch {
      return false;
    }
  }

  async deleteExpired(now = new Date(), retentionDays = 180): Promise<number> {
    const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const [metrics, receipts] = await this.database.$transaction([
      this.database.pilotMetricDaily.deleteMany({
        where: { dateKey: { lt: cutoffKey } },
      }),
      this.database.pilotMetricReceipt.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
    ]);
    return metrics.count + receipts.count;
  }
}
