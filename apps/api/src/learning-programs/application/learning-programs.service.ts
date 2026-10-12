import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  learningProgramCatalogSchema,
  type LearningProgramCatalogDto,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { deriveProgramAccess } from '../domain/program-availability.js';

@Injectable()
export class LearningProgramsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async listCatalog(): Promise<LearningProgramCatalogDto> {
    try {
      const rows = await this.database.learningProgram.findMany({
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

      return learningProgramCatalogSchema.parse({
        programs: rows.map((row) => ({
          ...deriveProgramAccess({
            availabilityStatus: row.availabilityStatus,
            slug: row.slug,
          }),
          availabilityStatus: row.availabilityStatus,
          description: row.description,
          iconKey: row.iconKey,
          learningGoal: row.learningGoal,
          name: row.name,
          proficiencyLabel: row.proficiencyLabel,
          publishedLevelCount: row.paths.reduce(
            (count, path) => count + path.levels.length,
            0,
          ),
          publishedPathCount: row.paths.length,
          slug: row.slug,
        })),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'PROGRAM_CATALOG_UNAVAILABLE',
        message: 'Learning program catalog is temporarily unavailable.',
      });
    }
  }
}
