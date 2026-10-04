import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../common/database/prisma.service';
import { ObjectStorage } from '../storage/domain/object-storage.port';
import type { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Inject(ObjectStorage) private readonly storage: ObjectStorage,
  ) {}

  async check(): Promise<HealthResponseDto> {
    await this.database.$queryRaw(Prisma.sql`SELECT 1`);
    const probe = await this.storage.put({
      body: Buffer.from('ok'),
      contentType: 'text/plain',
      prefix: 'health',
    });
    await this.storage.delete(probe.key);

    return {
      checks: {
        database: { status: 'up' },
        storage: { status: 'up' },
      },
      status: 'ok',
    };
  }
}
