import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';
import {
  learningProgramCatalogSchema,
  type LearningProgramCatalogDto,
} from '@worklingo/contracts';

import { ConfigService } from '@nestjs/config';
import { IeltsTopicAdminService } from '../../ielts-study/application/ielts-topic-admin.service.js';
import { readIeltsV3Readiness } from '../../ielts-flow/domain/ielts-v3-readiness.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { deriveProgramAccess } from '../domain/program-availability.js';
import { readIeltsProgramReadiness } from './ielts-program-readiness.js';

@Injectable()
export class LearningProgramsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService, @Optional() @Inject(ConfigService) private readonly config?: ConfigService, @Optional() @Inject(IeltsTopicAdminService) private readonly topics?: IeltsTopicAdminService) {}

  async listCatalog(): Promise<LearningProgramCatalogDto> {
    try {
      return await this.database.$transaction(async (database) => {
        const rows = await database.learningProgram.findMany({
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          select: {
            availabilityStatus: true,
            description: true,
            iconKey: true,
            learningGoal: true,
            name: true,
            paths: {
              select: {
                levels: {
                  select: { id: true },
                  where: { status: 'PUBLISHED' },
                },
              },
              where: { status: 'PUBLISHED' },
            },
            proficiencyLabel: true,
            slug: true,
          },
          where: { availabilityStatus: { not: 'DISABLED' } },
        });

        const needsIeltsReadiness = rows.some((row) => row.slug === 'ielts' &&
          (row.availabilityStatus === 'BETA' || row.availabilityStatus === 'AVAILABLE'));
        const ieltsReady = needsIeltsReadiness && (this.config?.get('ieltsFlow')==='v3' && this.topics ? (await readIeltsV3Readiness(database,this.topics)).ready : (await readIeltsProgramReadiness(database)).ready);

        return learningProgramCatalogSchema.parse({
          programs: rows.map((row) => ({
            ...deriveProgramAccess({
              availabilityStatus: row.availabilityStatus,
              slug: row.slug,
              ieltsReady,
            }),
            availabilityStatus: row.availabilityStatus,
            description: row.description,
            iconKey: row.iconKey,
            learningGoal: row.learningGoal,
            name: row.name,
            proficiencyLabel: row.proficiencyLabel,
            publishedLevelCount: row.slug === 'ielts' && this.config?.get('ieltsFlow')!=='v3' ? 0 : row.paths.reduce(
              (count, path) => count + path.levels.length,
              0,
            ),
            publishedPathCount: row.slug === 'ielts' && this.config?.get('ieltsFlow')!=='v3' ? 0 : row.paths.length,
            slug: row.slug,
          })),
        });
      }, { isolationLevel: 'RepeatableRead' });
    } catch {
      throw new ServiceUnavailableException({
        code: 'PROGRAM_CATALOG_UNAVAILABLE',
        message: 'Learning program catalog is temporarily unavailable.',
      });
    }
  }
}
