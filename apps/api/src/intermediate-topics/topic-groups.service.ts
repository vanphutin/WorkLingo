import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseLessonSource } from '@worklingo/content-format';
import type { z } from 'zod';
import { assignIntermediateTopicGroupSchema, createIntermediateTopicGroupSchema, deleteIntermediateTopicGroupSchema,
  intermediateTopicGroupCatalogSchema, intermediateTopicGroupSchema, updateIntermediateTopicGroupSchema,
  type AssignIntermediateTopicGroup, type CreateIntermediateTopicGroup, type DeleteIntermediateTopicGroup, type UpdateIntermediateTopicGroup } from '@worklingo/contracts';
import { PrismaService } from '../common/database/prisma.service.js';
import { isTopicSource } from './topic-source.js';
import { lockTopicGroups } from './topic-group-lock.js';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException('Invalid topic group request');
  return result.data;
}

@Injectable()
export class TopicGroupsService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  catalog() {
    return this.database.$transaction(tx => this.readCatalog(tx), { isolationLevel: 'RepeatableRead' });
  }

  async create(input: CreateIntermediateTopicGroup) {
    const data = parse(createIntermediateTopicGroupSchema, input);
    return this.mutate(async tx => {
      const group = await tx.intermediateTopicGroup.create({ data: { ...data, normalizedName: data.name.toLowerCase() } });
      return intermediateTopicGroupSchema.parse({ id: group.id, name: group.name, description: group.description, revision: group.revision, lessonCount: 0 });
    });
  }

  async update(id: string, input: UpdateIntermediateTopicGroup) {
    const { expectedRevision, ...data } = parse(updateIntermediateTopicGroupSchema, input);
    return this.mutate(async tx => {
      await this.group(tx, id, expectedRevision);
      await tx.intermediateTopicGroup.update({ where: { id, revision: expectedRevision },
        data: { ...data, normalizedName: data.name.toLowerCase(), revision: { increment: 1 } } });
      const catalog = await this.readCatalog(tx);
      return intermediateTopicGroupSchema.parse(catalog.groups.find(group => group.id === id));
    });
  }

  async remove(id: string, input: DeleteIntermediateTopicGroup) {
    const data = parse(deleteIntermediateTopicGroupSchema, input);
    return this.mutate(async tx => {
      await this.group(tx, id, data.expectedRevision);
      await tx.contentImport.updateMany({ where: { topicGroupId: id },
        data: { topicGroupId: null, topicGroupRevision: { increment: 1 } } });
      await tx.lesson.updateMany({ where: { topicGroupId: id }, data: { topicGroupId: null } });
      await tx.intermediateTopicGroup.delete({ where: { id, revision: data.expectedRevision } });
      return this.readCatalog(tx);
    });
  }

  async assign(importId: string, input: AssignIntermediateTopicGroup) {
    const data = parse(assignIntermediateTopicGroupSchema, input);
    return this.mutate(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ContentImport" WHERE "id" = ${importId}::uuid FOR UPDATE`;
      const source = await tx.contentImport.findUnique({ where: { id: importId } });
      if (!source) throw new NotFoundException('Topic import not found');
      if (!isTopicSource(source.rawSource)) throw new BadRequestException('Import is not an Intermediate topic');
      this.checkRevision(source.topicGroupRevision, data.expectedRevision);
      if (data.groupId) await this.group(tx, data.groupId);
      if (source.lessonId) {
        await tx.lesson.update({ where: { id: source.lessonId }, data: { topicGroupId: data.groupId } });
      }
      await tx.contentImport.updateMany({ where: source.lessonId ? { lessonId: source.lessonId } : { id: importId },
        data: { topicGroupId: data.groupId, topicGroupRevision: { increment: 1 } } });
      return this.readCatalog(tx);
    });
  }

  private async group(tx: Prisma.TransactionClient, id: string, revision?: number) {
    const group = await tx.intermediateTopicGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Topic group not found');
    if (revision !== undefined) this.checkRevision(group.revision, revision);
    return group;
  }

  private checkRevision(currentRevision: number, expectedRevision: number) {
    if (currentRevision !== expectedRevision) throw new ConflictException({ code: 'TOPIC_GROUP_REVISION_CONFLICT',
      message: 'Topic group or lesson assignment changed. Refresh before retrying.', currentRevision });
  }

  private async mutate<T>(write: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.database.$transaction(async tx => {
        await lockTopicGroups(tx);
        return write(tx);
      });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'P2002') throw new ConflictException({ code: 'TOPIC_GROUP_NAME_CONFLICT', message: 'A topic group with this name already exists.' });
      if (code === 'P2003' || code === 'P2025' || code === 'P2034') throw new ConflictException({ code: 'TOPIC_GROUP_CONFLICT', message: 'Topic group or lesson changed concurrently. Refresh before retrying.' });
      throw error;
    }
  }

  private async readCatalog(tx: Prisma.TransactionClient) {
    const groups = await tx.intermediateTopicGroup.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
    const sources = await tx.contentImport.findMany({
      select: { id: true, rawSource: true, lessonId: true, status: true, topicGroupId: true, topicGroupRevision: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const topics = sources.filter(source => isTopicSource(source.rawSource));
    return intermediateTopicGroupCatalogSchema.parse({
      groups: groups.map(group => ({ id: group.id, name: group.name, description: group.description, revision: group.revision,
        lessonCount: new Set(topics.filter(source => source.topicGroupId === group.id).map(source => source.lessonId ?? source.id)).size })),
      lessons: topics.map(source => ({ importId: source.id, title: parseLessonSource(source.rawSource).document.lesson?.title?.trim() || 'Untitled topic',
        status: source.status, groupId: source.topicGroupId, revision: source.topicGroupRevision })),
    });
  }
}
