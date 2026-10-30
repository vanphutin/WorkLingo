import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { adminProgramSchema, adminProgramListSchema, createProgramSchema, updateProgramSchema, publishProgramSchema, reservedProgramSlugs, type AdminProgramDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { validateProgramPublication } from '../domain/program-publication.js';
const programDto = (row: unknown) => { const keys = ['id', 'slug', 'name', 'description', 'learningGoal', 'proficiencyLabel', 'iconKey', 'displayOrder', 'availabilityStatus', 'revision', 'progressionPolicy', 'curriculumRevisionIds']; return adminProgramSchema.parse(Object.fromEntries(keys.map(key => [key, (row as Record<string, unknown>)[key]]))); };
@Injectable()
export class AdminProgramsService {
    constructor(
    @Inject(PrismaService)
    private readonly database: PrismaService) { }
    async list() { return adminProgramListSchema.parse({ programs: (await this.database.learningProgram.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] })).map(programDto) }); }
    async create(actorId: string, raw: unknown) { const parsed = createProgramSchema.safeParse(raw); if (!parsed.success)
        throw new BadRequestException('INVALID_PROGRAM'); const { idempotencyKey, ...metadata } = parsed.data; return this.command(actorId, 'create', idempotencyKey, null, parsed.data, async (tx) => tx.learningProgram.create({ data: { ...metadata, availabilityStatus: 'IN_DEVELOPMENT', progressionPolicy: 'ACTIVITY_COMPLETION' } })); }
    async update(actorId: string, id: string, raw: unknown) { const parsed = updateProgramSchema.safeParse(raw); if (!parsed.success)
        throw new BadRequestException('INVALID_PROGRAM'); const { idempotencyKey, expectedRevision, ...metadata } = parsed.data; return this.command(actorId, 'update', idempotencyKey, id, parsed.data, async (tx) => { await this.current(tx, id, expectedRevision); return tx.learningProgram.update({ where: { id }, data: { ...metadata, revision: { increment: 1 } } }); }); }
    async publish(actorId: string, id: string, raw: unknown) {
        const parsed = publishProgramSchema.safeParse(raw);
        if (!parsed.success)
            throw new BadRequestException('INVALID_PROGRAM');
        const { idempotencyKey, expectedRevision, curriculumRevisionIds } = parsed.data;
        return this.command(actorId, 'publish', idempotencyKey, id, parsed.data, async (tx) => {
            await this.current(tx, id, expectedRevision);
            // Share locks prevent concurrent archive/rebinding while this publication validates its immutable pins.
            await tx.$queryRaw `SELECT "id" FROM "CurriculumRevision" WHERE "id" IN (${Prisma.join(curriculumRevisionIds.map(value => Prisma.sql `${value}::uuid`))}) ORDER BY "id" FOR SHARE`;
            // Publication is rare. Shared relation locks also cover attachment
            // insert/delete phantoms and hierarchy reparenting without requiring
            // every existing curriculum command to follow a new lock protocol.
            // Concurrent readers/publications remain compatible; authoring DML
            // waits until the validated pins and audit have committed.
            await tx.$executeRaw`LOCK TABLE "CurriculumPrerequisite", "CurriculumRevisionLesson", "LearningPath", "Lesson", "LessonVersion", "Level", "Mission", "MissionLesson" IN SHARE MODE`;
            const lockedRows = await tx.curriculumRevision.findMany({ where: { id: { in: curriculumRevisionIds } }, include: { mission: { include: { level: { include: { path: true } } } }, prerequisites: true, lessons: { include: { lessonVersion: { include: { lesson: { include: { missions: true } } } } } } } });
            validateProgramPublication(id, curriculumRevisionIds, lockedRows);
            return tx.learningProgram.update({ where: { id }, data: { curriculumRevisionIds, availabilityStatus: 'AVAILABLE', revision: { increment: 1 } } });
        });
    }
    private async current(tx: Prisma.TransactionClient, id: string, revision: number) { const row = await tx.learningProgram.findUnique({ where: { id } }); if (!row)
        throw new NotFoundException('Program not found'); if (reservedProgramSlugs.some(slug => slug === row.slug) || row.progressionPolicy !== 'ACTIVITY_COMPLETION')
        throw new UnprocessableEntityException('PROGRAM_RESERVED'); if (row.revision !== revision)
        throw new ConflictException('PROGRAM_REVISION_STALE'); return row; }
    private async command(actorId: string, action: string, key: string, id: string | null, payload: unknown, execute: (tx: Prisma.TransactionClient) => Promise<unknown>): Promise<AdminProgramDto> {
        const operation = 'program:' + action, requestHash = createHash('sha256').update(JSON.stringify({ id, payload })).digest('hex');
        try {
            return await this.database.$transaction(async (tx) => {
                await tx.$queryRaw `SELECT "id" FROM "User" WHERE "id"=${actorId}::uuid FOR UPDATE`;
                if (id)
                    await tx.$queryRaw `SELECT "id" FROM "LearningProgram" WHERE "id"=${id}::uuid FOR UPDATE`;
                const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: key } } });
                if (receipt) {
                    if (receipt.requestHash !== requestHash)
                        throw new ConflictException('IDEMPOTENCY_CONFLICT');
                    return adminProgramSchema.parse(receipt.responseBody);
                }
                const previous = id ? await tx.learningProgram.findUnique({ where: { id }, select: { revision: true, curriculumRevisionIds: true } }) : null;
                const result = programDto(await execute(tx));
                await tx.auditLog.create({ data: { actorId, action: operation, resourceType: 'LearningProgram', resourceId: result.id, metadata: { revision: result.revision, previousRevision: previous?.revision ?? null, oldCurriculumRevisionIds: previous?.curriculumRevisionIds ?? [], newCurriculumRevisionIds: result.curriculumRevisionIds } } });
                await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: key, requestHash, responseStatus: action === 'create' ? 201 : 200, responseBody: result as Prisma.InputJsonValue } });
                return result;
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code))
                throw new ConflictException('PROGRAM_CONFLICT');
            throw error;
        }
    }
}
