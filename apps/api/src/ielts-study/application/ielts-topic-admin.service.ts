import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseIeltsTopicManifest, parseLessonSource } from '@worklingo/content-format';
import { adminIeltsTopicSchema, publishIeltsTopicResultSchema, type IeltsContentQualificationResult, type PublishIeltsTopicResult } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { CurriculumService } from '../../curriculum/application/curriculum.service.js';
import { qualifyIeltsTopicPack } from '../domain/ielts-topic-validation.js';

interface Command { expectedRevision: number; idempotencyKey: string }
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class IeltsTopicAdminService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(CurriculumService) private readonly curriculum: CurriculumService) {}
  async list() { return Promise.all((await this.db.ieltsTopic.findMany({ orderBy: { slug: 'asc' }, select: { id: true } })).map(item => this.get(item.id))); }
  async get(id: string) {
    const topic = await this.db.ieltsTopic.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' } } } });
    if (!topic) throw new NotFoundException('IELTS topic not found.');
    return adminIeltsTopicSchema.parse({ id: topic.id, slug: topic.slug, status: topic.status, draftRevision: topic.draftRevision, draft: topic.draftContent, currentPublishedVersionId: topic.currentPublishedVersionId, updatedAt: topic.updatedAt.toISOString(), versions: topic.versions.map(version => ({ id: version.id, version: version.version, status: version.status, publishedAt: version.publishedAt.toISOString() })) });
  }
  async saveDraft(actorId: string, topicId: string | null, input: { expectedRevision: number | null; idempotencyKey: string; content: unknown }) {
    let content;
    try { content = parseIeltsTopicManifest(input.content); } catch (error) { throw new UnprocessableEntityException({ code: 'IELTS_TOPIC_MANIFEST_INVALID', message: error instanceof Error ? error.message : 'Invalid manifest' }); }
    const slug = content.packs[0]!.slug.replace(/-(foundation|developing|competent|advanced)$/u, '');
    const operation = `ielts-topic-save:${topicId ?? slug}`;
    const id = await this.db.$transaction(async tx => {
      await this.actor(tx, actorId);
      await this.lock(tx, topicId ?? slug);
      const receipt = await this.receipt(tx, actorId, operation, input.idempotencyKey, input);
      if (receipt) return (receipt as { topicId: string }).topicId;
      const topic = topicId ? await tx.ieltsTopic.findUnique({ where: { id: topicId } }) : null;
      if (topicId && !topic) throw new NotFoundException('IELTS topic not found.');
      if (topic && topic.draftRevision !== input.expectedRevision) throw new ConflictException({ code: 'IELTS_TOPIC_REVISION_STALE' });
      if (!topic && input.expectedRevision !== null) throw new BadRequestException('A new topic has no previous revision.');
      const saved = topic
        ? await tx.ieltsTopic.update({ where: { id: topic.id }, data: { draftContent: json(content), draftRevision: { increment: 1 }, status: topic.currentPublishedVersionId && topic.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT' } })
        : await tx.ieltsTopic.create({ data: { slug, draftContent: json(content) } });
      await tx.auditLog.create({ data: { actorId, action: 'SAVE_IELTS_TOPIC_DRAFT', resourceType: 'IeltsTopic', resourceId: saved.id, newState: { draftRevision: saved.draftRevision } } });
      await this.saveReceipt(tx, actorId, operation, input.idempotencyKey, input, { topicId: saved.id });
      return saved.id;
    });
    return this.get(id);
  }

  async validate(topicId: string, input: { expectedRevision: number }): Promise<IeltsContentQualificationResult> {
    return this.db.$transaction(async tx => {
      await this.lock(tx, topicId);
      const topic = await this.requireTopic(tx, topicId, input.expectedRevision);
      const result = await this.qualify(tx, topic.draftContent);
      // Checking a published draft must not revoke the current publication.
      if (topic.status !== 'PUBLISHED') await tx.ieltsTopic.update({ where: { id: topicId }, data: { status: result.canPublish ? 'VALIDATED' : 'DRAFT' } });
      return result;
    });
  }

  async publish(actorId: string, topicId: string, input: Command): Promise<PublishIeltsTopicResult> {
    const operation = `ielts-topic-publish:${topicId}`;
    return this.db.$transaction(async tx => {
      await this.actor(tx, actorId);
      await this.lock(tx, topicId);
      const receipt = await this.receipt(tx, actorId, operation, input.idempotencyKey, input);
      if (receipt) return publishIeltsTopicResultSchema.parse(receipt);
      const topic = await this.requireTopic(tx, topicId, input.expectedRevision);
      if (topic.status === 'PUBLISHED' && (await tx.ieltsTopicVersion.findUnique({where:{id:topic.currentPublishedVersionId!}}))?.sourceHash === hash(topic.draftContent)) throw new ConflictException({ code: 'IELTS_TOPIC_ALREADY_PUBLISHED' });
      const qualification = await this.qualify(tx, topic.draftContent);
      if (!qualification.canPublish) throw new UnprocessableEntityException({ code: 'IELTS_TOPIC_VALIDATION_FAILED', issues: qualification.issues });
      const latest = await tx.ieltsTopicVersion.findFirst({ where: { topicId }, orderBy: { version: 'desc' } });
      const version = await tx.ieltsTopicVersion.create({ data: { topicId, version: (latest?.version ?? 0) + 1, content: json(topic.draftContent), sourceHash: hash(topic.draftContent) } });
      if (topic.currentPublishedVersionId) await tx.ieltsTopicVersion.update({ where: { id: topic.currentPublishedVersionId }, data: { status: 'ARCHIVED', archivedAt: new Date() } });
      await tx.ieltsTopic.update({ where: { id: topicId }, data: { status: 'PUBLISHED', currentPublishedVersionId: version.id } });
      const result = { topicId, topicVersionId: version.id, version: version.version, publishedAt: version.publishedAt.toISOString() };
      await tx.auditLog.create({ data: { actorId, action: 'PUBLISH_IELTS_TOPIC', resourceType: 'IeltsTopicVersion', resourceId: version.id, oldState: { currentPublishedVersionId: topic.currentPublishedVersionId }, newState: json(result) } });
      await this.saveReceipt(tx, actorId, operation, input.idempotencyKey, input, result);
      return result;
    }, { timeout: 15_000 });
  }

  async qualify(db: Prisma.TransactionClient, value: unknown): Promise<IeltsContentQualificationResult> {
    const issues: IeltsContentQualificationResult['issues'] = [];
    let content;
    try { content = parseIeltsTopicManifest(value); } catch (error) { return { canPublish: false, supportedDurations: [], qualifiedModes: [], issues: [{ code: 'IELTS_TOPIC_MANIFEST_INVALID', path: 'content', message: error instanceof Error ? error.message : 'Invalid manifest' }] }; }
    const durations = new Set<90 | 120 | 150>();
    for (const pack of content.packs) {
      const revision = await db.curriculumRevision.findUnique({ where: { id: pack.curriculumRevisionId }, include: { mission: { include: { level: { include: { path: { include: { program: true } } } } } }, lessons: true } });
      if (!revision || revision.status !== 'PUBLISHED' || revision.lessons.length !== 1) { issues.push({ code: 'IELTS_TOPIC_REVISION_UNAVAILABLE', path: pack.slug, message: 'Bind exactly one published curriculum lesson.' }); continue; }
      const path = revision.mission.level.path;
      if (path.program.slug !== 'ielts') { issues.push({ code: 'IELTS_TOPIC_WRONG_PROGRAM', path: pack.slug, message: 'The curriculum belongs to another program.' }); continue; }
      if (path.status !== 'PUBLISHED' || revision.mission.level.status !== 'PUBLISHED' || revision.mission.status !== 'PUBLISHED') { issues.push({ code: 'IELTS_TOPIC_REVISION_UNAVAILABLE', path: pack.slug, message: 'The IELTS path, level and mission must be published.' }); continue; }
      try {
        const mission = await this.curriculum.getPublishedMissionForRevision(pack.curriculumRevisionId, db);
        const audioActivities=mission.lessonVersion.activities.filter(activity=>activity.activityType==='listening');
        let audioReady=true;
        for(const activity of audioActivities){
          const evidenceSlugs=activity.activityType==='listening'?activity.payload.questions.map(question=>question.evidence.split(':',1)[0]!).filter(Boolean):[];
          const slugs=[...new Set([...activity.contentReferences,...evidenceSlugs])];
          if(!await db.lessonVersionAudioArtifact.findFirst({where:{lessonVersionId:mission.lessonVersion.id,audioScriptSlug:{in:slugs},audioArtifact:{status:'READY',adapterName:{not:'fake-tts'}}},select:{id:true}})){audioReady=false;break;}
        }
        if(!audioReady){issues.push({code:'IELTS_TOPIC_AUDIO_UNAVAILABLE',path:pack.slug,message:'Every listening activity needs a playable published audio binding.'});continue;}
        const bankIds = mission.lessonVersion.wordBanks.map(bank => bank.id);
        const shared = await db.lessonVersionWordBank.findFirst({ where: { wordBankId: { in: bankIds }, lessonVersion: { lesson: { missions: { some: { mission: { level: { path: { programId: { not: path.programId } } } } } } } } } });
        if (shared) { issues.push({ code: 'IELTS_TOPIC_SHARED_BANK', path: pack.slug, message: 'IELTS must use independent word bank identities.' }); continue; }
        const source = await db.contentImport.findFirst({ where: { lessonVersionId: mission.lessonVersion.id, status: 'PUBLISHED' }, select: { rawSource: true, sourceHash: true, publishedVersion: { select: { sourceHash: true } } } });
        let evidenceSources: Record<string, string> = {};
        if (source && source.sourceHash === source.publishedVersion?.sourceHash && createHash('sha256').update(source.rawSource).digest('hex') === source.sourceHash) {
          const document = parseLessonSource(source.rawSource).document;
          evidenceSources = Object.fromEntries([...document.contents.map(block => [block.slug, block.text]), ...document.audioScripts.map(script => [script.slug, script.script])]);
        }
        const result = qualifyIeltsTopicPack(pack, { mission, programSlug: path.program.slug, evidenceSources });
        issues.push(...result.issues.map(issue => ({ ...issue, path: `${pack.slug}.${issue.path}` })));
        result.supportedDurations.forEach(duration => durations.add(duration));
      } catch { issues.push({ code: 'IELTS_TOPIC_REVISION_UNAVAILABLE', path: pack.slug, message: 'The published lesson snapshot is unavailable or inconsistent.' }); }
    }
    return { canPublish: issues.length === 0, supportedDurations: issues.length ? [] : [...durations].sort((a, b) => a - b), qualifiedModes: [], issues };
  }
  private async actor(tx: Prisma.TransactionClient, actorId: string) { const actor = await tx.user.findUnique({ where: { id: actorId } }); if (!actor || actor.status !== 'ACTIVE' || !['SYSTEM_ADMIN', 'CONTENT_ADMIN'].includes(actor.role)) throw new ConflictException({ code: 'IELTS_TOPIC_ADMIN_REQUIRED' }); }
  private async requireTopic(tx: Prisma.TransactionClient, id: string, revision: number) { const topic = await tx.ieltsTopic.findUnique({ where: { id } }); if (!topic) throw new NotFoundException('IELTS topic not found.'); if (topic.draftRevision !== revision) throw new ConflictException({ code: 'IELTS_TOPIC_REVISION_STALE' }); return topic; }
  private async lock(tx: Prisma.TransactionClient, id: string) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'ielts-topic:' + id}))`; }
  private async receipt(tx: Prisma.TransactionClient, actorId: string, operation: string, idempotencyKey: string, input: unknown) { const receipt = await tx.mutationReceipt.findUnique({ where: { actorId_operation_idempotencyKey: { actorId, operation, idempotencyKey } } }); if (receipt && receipt.requestHash !== hash(input)) throw new ConflictException({ code: 'IDEMPOTENCY_CONFLICT' }); return receipt?.responseBody ?? null; }
  private async saveReceipt(tx: Prisma.TransactionClient, actorId: string, operation: string, idempotencyKey: string, input: unknown, output: unknown) { await tx.mutationReceipt.create({ data: { actorId, operation, idempotencyKey, requestHash: hash(input), responseStatus: 200, responseBody: json(output) } }); }
}
