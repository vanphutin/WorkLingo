import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { adminProgramSchema, adminProgramListSchema, createProgramSchema, updateProgramSchema, publishProgramSchema, reservedProgramSlugs, type AdminProgramDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { captureProgramSnapshot } from './program-release-snapshot.js';
import { jsonValue, programAudit } from './program-command.js';
import { requireProgramActor } from './program-command.js';
export const programDto = (row: unknown) => { const keys = ['id', 'slug', 'name', 'description', 'learningGoal', 'proficiencyLabel', 'iconKey', 'displayOrder', 'availabilityStatus', 'revision', 'progressionPolicy', 'curriculumRevisionIds']; return adminProgramSchema.parse(Object.fromEntries(keys.map(key => [key, (row as Record<string, unknown>)[key]]))); };
@Injectable()
export class AdminProgramsService {
    constructor(
    @Inject(PrismaService)
    private readonly database: PrismaService) { }
    async list(actorId: string) { return this.database.$transaction(async tx => { await requireProgramActor(tx, actorId); return adminProgramListSchema.parse({ programs: (await tx.learningProgram.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] })).map(programDto) }); }); }
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
            const content = await captureProgramSnapshot(tx, id, curriculumRevisionIds);
            const latest = await tx.programVersion.aggregate({ where: { programId: id }, _max: { version: true } });
            let release = await tx.programVersion.create({ data: { programId: id, version: (latest._max.version ?? 0) + 1, snapshot: jsonValue(content), policy: jsonValue(content.policy), curriculumRevisionIds, curricula: { create: curriculumRevisionIds.map((curriculumRevisionId, index) => ({ curriculumRevisionId, order: index + 1 })) } } });
            await programAudit(tx, actorId, 'program.versions.created', 'ProgramVersion', release.id, { programId: id, command: 'legacy-publish' });
            for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED'] as const) {
                const previousStatus = release.status;
                release = await tx.programVersion.update({ where: { id: release.id }, data: { status: targetStatus, revision: { increment: 1 }, ...(targetStatus === 'PUBLISHED' ? { publishedAt: new Date() } : {}) } });
                await programAudit(tx, actorId, `program.versions.${targetStatus.toLowerCase()}`, 'ProgramVersion', release.id, { previousStatus, status: targetStatus, command: 'legacy-publish' });
            }
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
                await requireProgramActor(tx, actorId);
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
