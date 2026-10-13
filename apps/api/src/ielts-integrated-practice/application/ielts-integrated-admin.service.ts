import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  adminIeltsIntegratedProfileSchema, ieltsIntegratedProfileContentSchema, ieltsIntegratedValidationResultSchema,
  publishIeltsIntegratedResultSchema, type AdminIeltsIntegratedProfileDto, type IeltsIntegratedCommandInput,
  type IeltsIntegratedValidationResult, type PublishIeltsIntegratedResult,
} from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';

type ProfileRecord = Prisma.IeltsIntegratedProfileGetPayload<{ include: { currentPublishedVersion: true; versions: true } }>;
type VersionRecord = Prisma.IeltsIntegratedProfileVersionGetPayload<Record<string, never>>;
interface SaveDraftRequest { expectedRevision: number; idempotencyKey: string; content: unknown }

@Injectable()
export class IeltsIntegratedAdminService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async list(): Promise<AdminIeltsIntegratedProfileDto[]> {
    const profiles = await this.database.ieltsIntegratedProfile.findMany({ include: { currentPublishedVersion: true, versions: { orderBy: { version: 'desc' } } }, orderBy: { durationMinutes: 'asc' } });
    return profiles.map((profile) => this.toDto(profile));
  }
  async get(profileId: string): Promise<AdminIeltsIntegratedProfileDto> {
    const profile = await this.database.ieltsIntegratedProfile.findUnique({ where: { id: profileId }, include: { currentPublishedVersion: true, versions: { orderBy: { version: 'desc' } } } });
    if (!profile) throw new NotFoundException('IELTS integrated profile was not found.');
    return this.toDto(profile);
  }
  async save(actorId: string, profileId: string, input: SaveDraftRequest): Promise<AdminIeltsIntegratedProfileDto> {
    const content = ieltsIntegratedProfileContentSchema.parse(input.content);
    await this.database.$transaction(async (transaction) => {
      const operation = `save-ielts-integrated:${profileId}`; const requestHash = this.hash(input);
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-integrated-profile:' + profileId}))`;
      const replay = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('Idempotency key was reused with another request.'); return; }
      const profile = await transaction.ieltsIntegratedProfile.findUnique({ where: { id: profileId } });
      if (!profile) throw new NotFoundException('IELTS integrated profile was not found.');
      if (profile.durationMinutes !== content.durationMinutes) throw new BadRequestException('Profile duration cannot be changed.');
      if (profile.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS integrated profile revision is stale.');
      const updated = await transaction.ieltsIntegratedProfile.updateMany({ where: { id: profileId, draftRevision: input.expectedRevision }, data: { draftContent: content as Prisma.InputJsonValue, draftRevision: { increment: 1 }, status: 'DRAFT' } });
      if (updated.count !== 1) throw new ConflictException('IELTS integrated profile revision is stale.');
      await transaction.auditLog.create({ data: { actorId, action: 'UPDATE_IELTS_INTEGRATED_PROFILE', resourceType: 'IeltsIntegratedProfile', resourceId: profileId, metadata: { durationMinutes: content.durationMinutes } } });
      await transaction.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 200, responseBody: { profileId } } });
    });
    return this.get(profileId);
  }
  async validate(profileId: string, input: IeltsIntegratedCommandInput): Promise<IeltsIntegratedValidationResult> {
    const profile = await this.database.ieltsIntegratedProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('IELTS integrated profile was not found.');
    if (profile.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS integrated profile revision is stale.');
    const parsed = ieltsIntegratedProfileContentSchema.safeParse(profile.draftContent);
    const issues = parsed.success ? [] : parsed.error.issues.map((issue) => ({ code: 'INVALID_PROFILE', path: issue.path.join('.'), message: issue.message }));
    const status = issues.length ? 'DRAFT' as const : 'VALIDATED' as const;
    await this.database.ieltsIntegratedProfile.update({ where: { id: profileId }, data: { status } });
    return ieltsIntegratedValidationResultSchema.parse({ profileId, draftRevision: profile.draftRevision, status, canPublish: !issues.length, issues });
  }
  async publish(actorId: string, profileId: string, input: IeltsIntegratedCommandInput): Promise<PublishIeltsIntegratedResult> {
    const operation = `publish-ielts-integrated:${profileId}`; const requestHash = this.hash(input);
    return this.database.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-integrated-profile:' + profileId}))`;
      const transactionReplay = await transaction.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey: input.idempotencyKey } } });
      if (transactionReplay) {
        if (transactionReplay.requestHash !== requestHash) throw new ConflictException('Idempotency key was reused with another request.');
        return publishIeltsIntegratedResultSchema.parse(transactionReplay.responseBody);
      }
      const profile = await transaction.ieltsIntegratedProfile.findUnique({ where: { id: profileId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
      if (!profile) throw new NotFoundException('IELTS integrated profile was not found.');
      if (profile.draftRevision !== input.expectedRevision) throw new ConflictException('IELTS integrated profile revision is stale.');
      const content = ieltsIntegratedProfileContentSchema.parse(profile.draftContent); const publishedAt = new Date();
      const version = await transaction.ieltsIntegratedProfileVersion.create({ data: { profileId, version: (profile.versions[0]?.version ?? 0) + 1, durationMinutes: content.durationMinutes, sourceHash: this.hash(content), content: content as Prisma.InputJsonValue, publishedAt } });
      if (profile.currentPublishedVersionId) await transaction.ieltsIntegratedProfileVersion.update({ where: { id: profile.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: publishedAt } });
      await transaction.ieltsIntegratedProfile.update({ where: { id: profileId }, data: { currentPublishedVersionId: version.id, status: 'PUBLISHED' } });
      await transaction.auditLog.create({ data: { actorId, action: 'PUBLISH_IELTS_INTEGRATED_PROFILE', resourceType: 'IeltsIntegratedProfileVersion', resourceId: version.id, metadata: { profileId, durationMinutes: content.durationMinutes } } });
      const response = publishIeltsIntegratedResultSchema.parse({ profileId, profileVersionId: version.id, version: version.version, publishedAt: publishedAt.toISOString() });
      await transaction.mutationReceipt.create({ data: { actorId, operation, idempotencyKey: input.idempotencyKey, requestHash, responseStatus: 201, responseBody: response } });
      return response;
    });
  }
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private toDto(profile: ProfileRecord): AdminIeltsIntegratedProfileDto {
    return adminIeltsIntegratedProfileSchema.parse({ id: profile.id, durationMinutes: profile.durationMinutes, status: profile.status, draftRevision: profile.draftRevision, draft: profile.draftContent, currentPublishedVersion: profile.currentPublishedVersion ? this.version(profile.currentPublishedVersion) : null, versions: profile.versions.map((version) => this.version(version)), updatedAt: profile.updatedAt.toISOString() });
  }
  private version(version: VersionRecord) { return { id: version.id, version: version.version, status: version.status, publishedAt: version.publishedAt.toISOString(), archivedAt: version.archivedAt?.toISOString() ?? null }; }
}
