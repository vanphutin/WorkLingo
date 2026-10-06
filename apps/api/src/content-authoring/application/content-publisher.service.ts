import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ActivityType, LearningBlockType, Prisma } from '@prisma/client';
import {
  analyzeLessonSource,
  parseLessonSource,
} from '@worklingo/content-format';
import {
  ContentAuthoringErrorCode,
  type ContentIssueDto,
  type PublishContentImportInput,
  type PublishContentImportResult,
} from '@worklingo/contracts';

import { PrismaService } from '../../common/database/prisma.service.js';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';

@Injectable()
export class ContentPublisherService {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  async publish(
    importId: string,
    actorId: string,
    input: PublishContentImportInput,
  ): Promise<PublishContentImportResult> {
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          expectedDraftRevision: input.expectedDraftRevision,
          expectedSourceHash: input.expectedSourceHash,
          idempotencyKey: input.idempotencyKey,
        }),
      )
      .digest('hex');

    // 1. Idempotency check
    const existingReceipt = await this.database.mutationReceipt.findUnique({
      where: {
        actorId_operation_idempotencyKey: {
          actorId,
          operation: 'publish',
          idempotencyKey: input.idempotencyKey,
        },
      },
    });

    if (existingReceipt) {
      if (existingReceipt.requestHash === requestHash) {
        return existingReceipt.responseBody as unknown as PublishContentImportResult;
      }
      throw new ConflictException({
        code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
        message: 'Idempotency key reused with different request payload',
        statusCode: 409,
      });
    }

    // 2. Fetch ContentImport
    const contentImport = await this.database.contentImport.findUnique({
      where: { id: importId },
      include: { audioArtifacts: true },
    });

    if (!contentImport) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Content import ${importId} not found`,
        statusCode: 404,
      });
    }

    if (contentImport.status === 'PUBLISHED') {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.VERSION_ALREADY_PUBLISHED,
        message: 'Content import is already published',
        statusCode: 409,
      });
    }

    if (contentImport.draftRevision !== input.expectedDraftRevision) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
        message: `Draft revision conflict. Expected ${input.expectedDraftRevision} but current is ${contentImport.draftRevision}`,
        statusCode: 409,
      });
    }

    if (contentImport.sourceHash !== input.expectedSourceHash) {
      throw new ConflictException({
        code: ContentAuthoringErrorCode.SOURCE_HASH_MISMATCH,
        message: `Source hash mismatch. Expected ${input.expectedSourceHash} but current is ${contentImport.sourceHash}`,
        statusCode: 409,
      });
    }

    if (
      contentImport.status !== 'VALIDATED' ||
      contentImport.validationHash !== contentImport.sourceHash
    ) {
      throw new UnprocessableEntityException({
        code: ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED,
        message: 'Content import must be validated before publish',
        statusCode: 422,
      });
    }

    const report = contentImport.validationReport as {
      issues?: ContentIssueDto[];
    } | null;
    const hasErrors =
      report?.issues?.some((i) => i.severity === 'error') ?? false;
    if (hasErrors) {
      throw new UnprocessableEntityException({
        code: ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED,
        message: 'Content import contains blocking validation errors',
        statusCode: 422,
      });
    }

    const analysis = analyzeLessonSource(contentImport.rawSource);
    if (!analysis.canPublish || !analysis.normalizedDraft) {
      throw new UnprocessableEntityException({
        code: ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED,
        message: 'Content import cannot be normalized for publish',
        statusCode: 422,
      });
    }

    const normalizedDraft = analysis.normalizedDraft;

    // 3. Audio readiness check
    const parseRes = parseLessonSource(contentImport.rawSource);
    const audioScriptsMap = new Map<string, { script: string; hash: string }>();
    for (const script of parseRes.document.audioScripts) {
      audioScriptsMap.set(script.slug, {
        script: script.script,
        hash: createHash('sha256').update(script.script).digest('hex'),
      });
    }

    for (const act of parseRes.document.activities) {
      if (act.activityType === 'listening') {
        const audioRef = act.audioRef;
        if (!audioRef) {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
            message: `Listening activity "${act.slug}" requires an audio_ref`,
            statusCode: 422,
          });
        }
        const scriptInfo = audioScriptsMap.get(audioRef);
        if (!scriptInfo) {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
            message: `Referenced audio script "${audioRef}" does not exist in lesson`,
            statusCode: 422,
          });
        }

        const artifact = contentImport.audioArtifacts.find(
          (a) => a.audioScriptSlug === audioRef && a.status === 'READY',
        );
        if (!artifact) {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
            message: `Audio artifact for script "${audioRef}" is not ready`,
            statusCode: 422,
          });
        }

        if (artifact.scriptHash !== scriptInfo.hash) {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_SCRIPT_STALE,
            message: `Audio artifact for script "${audioRef}" is stale`,
            statusCode: 422,
          });
        }
      }
    }

    // 4. Execute publication transaction with PostgreSQL advisory lock
    return this.database.$transaction(async (tx) => {
      // Advisory transaction lock scoped to lesson slug
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedDraft.slug}))`;

      // Requests can pass the optimistic checks concurrently before either one commits.
      // Re-check idempotency after taking the lesson lock so an identical waiter can
      // replay the committed response instead of surfacing a unique-key failure.
      const receiptAfterLock = await tx.mutationReceipt.findUnique({
        where: {
          actorId_operation_idempotencyKey: {
            actorId,
            operation: 'publish',
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (receiptAfterLock) {
        if (receiptAfterLock.requestHash === requestHash) {
          return receiptAfterLock.responseBody as unknown as PublishContentImportResult;
        }
        throw new ConflictException({
          code: ContentAuthoringErrorCode.IDEMPOTENCY_KEY_REUSED,
          message: 'Idempotency key reused with different request payload',
          statusCode: 409,
        });
      }

      // Lock and re-read the authoring record. A different idempotency key must not
      // publish the same validated draft again after the first request commits.
      await tx.$queryRaw`SELECT "id" FROM "ContentImport" WHERE "id" = ${importId}::uuid FOR UPDATE`;
      const lockedImport = await tx.contentImport.findUnique({ where: { id: importId } });
      if (!lockedImport) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Content import ${importId} not found`,
          statusCode: 404,
        });
      }
      if (lockedImport.status === 'PUBLISHED' || lockedImport.status === 'ARCHIVED') {
        throw new ConflictException({
          code: ContentAuthoringErrorCode.VERSION_ALREADY_PUBLISHED,
          message: 'Content import is already published',
          statusCode: 409,
        });
      }
      if (lockedImport.draftRevision !== input.expectedDraftRevision) {
        throw new ConflictException({
          code: ContentAuthoringErrorCode.DRAFT_REVISION_CONFLICT,
          message: `Draft revision conflict. Expected ${input.expectedDraftRevision} but current is ${lockedImport.draftRevision}`,
          statusCode: 409,
        });
      }
      if (lockedImport.sourceHash !== input.expectedSourceHash) {
        throw new ConflictException({
          code: ContentAuthoringErrorCode.SOURCE_HASH_MISMATCH,
          message: `Source hash mismatch. Expected ${input.expectedSourceHash} but current is ${lockedImport.sourceHash}`,
          statusCode: 409,
        });
      }
      if (
        lockedImport.status !== 'VALIDATED' ||
        lockedImport.validationHash !== lockedImport.sourceHash
      ) {
        throw new UnprocessableEntityException({
          code: ContentAuthoringErrorCode.CONTENT_VALIDATION_FAILED,
          message: 'Content import must be validated before publish',
          statusCode: 422,
        });
      }

      // Find or create logical lesson
      const lesson = await tx.lesson.upsert({
        where: { slug: normalizedDraft.slug },
        update: {},
        create: { slug: normalizedDraft.slug },
      });

      // Allocate next version number
      const maxVer = await tx.lessonVersion.aggregate({
        where: { lessonId: lesson.id },
        _max: { version: true },
      });
      const nextVersion = (maxVer._max.version ?? 0) + 1;

      // Resolve WordBanks first so snapshot.wordBanks has matching database WordBank IDs
      const wordBankRecords: Array<{
        bank: { id: string; slug: string; name: string };
        versionId: string;
        wb: (typeof normalizedDraft.wordBanks)[number];
      }> = [];

      for (const wb of normalizedDraft.wordBanks) {
        const wordBank = await tx.wordBank.upsert({
          where: { slug: wb.slug },
          update: {},
          create: { id: wb.id ?? randomUUID(), slug: wb.slug, name: wb.name },
        });

        const wbHash = createHash('sha256')
          .update(JSON.stringify(wb))
          .digest('hex');

        let wbVersion = await tx.wordBankVersion.findFirst({
          where: { wordBankId: wordBank.id, sourceHash: wbHash },
        });

        if (!wbVersion) {
          const maxWb = await tx.wordBankVersion.aggregate({
            where: { wordBankId: wordBank.id },
            _max: { version: true },
          });
          const nextWbVersion = (maxWb._max.version ?? 0) + 1;

          wbVersion = await tx.wordBankVersion.create({
            data: {
              wordBankId: wordBank.id,
              name: wb.name,
              sourceHash: wbHash,
              version: nextWbVersion,
            },
          });

          for (const lb of wb.languageBlocks) {
            await tx.languageBlockVersion.create({
              data: {
                id: lb.id ?? randomUUID(),
                wordBankVersionId: wbVersion.id,
                slug: lb.slug,
                canonicalForm: lb.canonicalForm,
                meaning: lb.meaning,
                pronunciation: lb.pronunciation,
                collocations: [...lb.collocations],
                grammarPattern: lb.grammarPattern,
                examples: [...lb.examples],
                commonErrors: [...lb.commonErrors],
                cefrLevel: lb.cefrLevel,
                transferContexts: [...lb.transferContexts],
              },
            });
          }
        }

        wordBankRecords.push({ bank: wordBank, versionId: wbVersion.id, wb });
      }

      // Build UUID-backed snapshot conforming to lessonSnapshotSchema
      const snapshot = {
        title: normalizedDraft.title,
        contentBlocks: normalizedDraft.contentBlocks.map((b) => ({
          id: b.id ?? randomUUID(),
          slug: b.slug,
          type: b.type,
          text: b.text,
          ...(b.audio ? { audio: b.audio } : {}),
        })),
        wordBanks: wordBankRecords.map(({ bank, wb }) => ({
          id: bank.id,
          slug: wb.slug,
          name: wb.name,
          languageBlocks: wb.languageBlocks.map((lb) => ({
            id: lb.id ?? randomUUID(),
            slug: lb.slug,
            canonicalForm: lb.canonicalForm,
            meaning: lb.meaning,
            pronunciation: lb.pronunciation,
            collocations: [...lb.collocations],
            grammarPattern: lb.grammarPattern,
            examples: [...lb.examples],
            commonErrors: [...lb.commonErrors],
            cefrLevel: lb.cefrLevel,
            transferContexts: [...lb.transferContexts],
          })),
        })),
        activities: normalizedDraft.activities.map((a) => {
          let payload: unknown = a.payload;
          const candidate = a.payload as { questions?: Array<Record<string, unknown>> } | undefined;
          if (candidate && Array.isArray(candidate.questions)) {
            payload = {
              ...candidate,
              questions: candidate.questions.map((q) => ({
                ...q,
                explanation:
                  typeof q['explanation'] === 'string' && q['explanation'].trim().length > 0
                    ? q['explanation']
                    : 'See lesson content for explanation.',
                evidence:
                  typeof q['evidence'] === 'string' && q['evidence'].trim().length > 0
                    ? q['evidence']
                    : a.contentReferences[0]
                      ? `${a.contentReferences[0]}:1`
                      : 'Context evidence',
              })),
            };
          }
          return {
            id: a.id ?? randomUUID(),
            slug: a.slug,
            order: a.order,
            activityType: a.activityType,
            learningBlock: a.learningBlock,
            skills: [...a.skills],
            contentReferences: [...a.contentReferences],
            languageBlockReferences: [...a.languageBlockReferences],
            payload,
          };
        }),
      };

      const validatedSnapshot = lessonSnapshotSchema.parse(snapshot);

      // Materialize new LessonVersion as DRAFT while children are inserted
      const publishedAt = new Date();
      const newVersion = await tx.lessonVersion.create({
        data: {
          lessonId: lesson.id,
          version: nextVersion,
          title: normalizedDraft.title,
          status: 'DRAFT',
          sourceHash: contentImport.sourceHash,
          parsedContent: validatedSnapshot as unknown as Prisma.InputJsonValue,
        },
      });

      // Materialize ContentBlocks
      for (const [order, block] of validatedSnapshot.contentBlocks.entries()) {
        await tx.contentBlock.create({
          data: {
            id: block.id,
            lessonVersionId: newVersion.id,
            slug: block.slug,
            type: block.type,
            order,
            text: block.text,
            metadata: block.audio ? { audio: block.audio } : {},
          },
        });
      }

      // Link WordBanks
      for (const record of wordBankRecords) {
        await tx.lessonVersionWordBank.create({
          data: {
            lessonVersionId: newVersion.id,
            wordBankId: record.bank.id,
            wordBankVersionId: record.versionId,
          },
        });
      }

      // Materialize Activities
      for (const act of validatedSnapshot.activities) {
        await tx.activity.create({
          data: {
            id: act.id,
            lessonVersionId: newVersion.id,
            slug: act.slug,
            activityType: act.activityType as ActivityType,
            learningBlock: act.learningBlock as LearningBlockType,
            order: act.order,
            skills: act.skills as ActivityType[],
            contentReferences: act.contentReferences,
            languageBlockReferences: act.languageBlockReferences,
            payload: act.payload as Prisma.InputJsonValue,
          },
        });
      }

      // Materialize LessonVersionAudioArtifacts
      for (const artifact of contentImport.audioArtifacts) {
        if (artifact.status === 'READY') {
          await tx.lessonVersionAudioArtifact.create({
            data: {
              lessonVersionId: newVersion.id,
              audioArtifactId: artifact.id,
              audioScriptSlug: artifact.audioScriptSlug,
            },
          });
        }
      }

      // Archive prior current published version atomically
      if (lesson.currentPublishedVersionId) {
        await tx.lessonVersion.update({
          where: { id: lesson.currentPublishedVersionId },
          data: { status: 'ARCHIVED' },
        });
      }

      // Transition new LessonVersion to PUBLISHED now that all children are materialized
      await tx.lessonVersion.update({
        where: { id: newVersion.id },
        data: {
          status: 'PUBLISHED',
          publishedAt,
        },
      });

      // Update Lesson currentPublishedVersionId
      await tx.lesson.update({
        where: { id: lesson.id },
        data: { currentPublishedVersionId: newVersion.id },
      });

      // Update ContentImport status to PUBLISHED
      await tx.contentImport.update({
        where: { id: importId },
        data: {
          status: 'PUBLISHED',
          lessonId: lesson.id,
          lessonVersionId: newVersion.id,
          updatedById: actorId,
        },
      });

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'PUBLISH_LESSON',
          resourceType: 'LessonVersion',
          resourceId: newVersion.id,
          oldState: {
            currentPublishedVersionId: lesson.currentPublishedVersionId,
          },
          newState: {
            currentPublishedVersionId: newVersion.id,
            version: nextVersion,
          },
          metadata: {
            lessonSlug: normalizedDraft.slug,
            importId,
          },
          contentImportId: importId,
        },
      });

      const responseBody: PublishContentImportResult = {
        importId,
        lessonId: lesson.id,
        lessonVersionId: newVersion.id,
        version: nextVersion,
        status: 'PUBLISHED',
        publishedAt: publishedAt.toISOString(),
      };

      // Record MutationReceipt
      await tx.mutationReceipt.create({
        data: {
          actorId,
          operation: 'publish',
          idempotencyKey: input.idempotencyKey,
          requestHash,
          responseStatus: 200,
          responseBody: responseBody as unknown as Prisma.InputJsonValue,
        },
      });

      return responseBody;
    });
  }

  async archiveLessonVersion(
    versionId: string,
    actorId: string,
  ): Promise<{ id: string; status: 'ARCHIVED' }> {
    const version = await this.database.lessonVersion.findUnique({
      where: { id: versionId },
      include: { lesson: { select: { slug: true } } },
    });

    if (!version) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Lesson version ${versionId} not found`,
        statusCode: 404,
      });
    }

    return this.database.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${version.lesson.slug}))`;
      const lockedVersion = await tx.lessonVersion.findUnique({ where: { id: versionId } });
      if (!lockedVersion) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `Lesson version ${versionId} not found`,
          statusCode: 404,
        });
      }
      if (lockedVersion.status === 'ARCHIVED') {
        return { id: versionId, status: 'ARCHIVED' };
      }
      if (lockedVersion.status !== 'PUBLISHED') {
        throw new ConflictException('Only published lesson versions can be archived');
      }

      await tx.lessonVersion.update({
        where: { id: versionId },
        data: { status: 'ARCHIVED' },
      });

      await tx.lesson.updateMany({
        where: {
          id: version.lessonId,
          currentPublishedVersionId: versionId,
        },
        data: { currentPublishedVersionId: null },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'ARCHIVE_LESSON',
          resourceType: 'LessonVersion',
          resourceId: versionId,
          oldState: { status: lockedVersion.status },
          newState: { status: 'ARCHIVED' },
          metadata: { lessonId: lockedVersion.lessonId, version: lockedVersion.version },
        },
      });

      return { id: versionId, status: 'ARCHIVED' };
    });
  }
}
