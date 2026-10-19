import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
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
import { lockTopicGroups } from '../../intermediate-topics/topic-group-lock.js';
import { PilotMetricsService } from '../../analytics/application/pilot-metrics.service.js';
import { lessonSnapshotSchema } from '../../curriculum/domain/curriculum.types.js';
import { approvedTopicForPublication, isTopicSource } from '../../intermediate-topics/topic-source.js';
import { ensureTopicMission } from '../../intermediate-topics/topic-mission.js';
import { buildVocabularyPublicationReview, normalizeVocabularyExpression, validateVocabularyPublicationSelection } from './publication-vocabulary.js';

@Injectable()
export class ContentPublisherService {
  constructor(
    @Inject(PrismaService) private readonly database: PrismaService,
    @Optional() @Inject(PilotMetricsService) private readonly pilotMetrics?: PilotMetricsService,
  ) {}

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
          selectedAudioArtifacts: input.selectedAudioArtifacts,
          ...(input.vocabularyReview ? { vocabularyReview: input.vocabularyReview } : {}),
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

    const selectedAudioArtifacts = input.selectedAudioArtifacts ?? {};
    const selectedIds = Object.values(selectedAudioArtifacts);
    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new UnprocessableEntityException({
        code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
        message: 'Each audio script must select a distinct artifact.',
        statusCode: 422,
      });
    }
    const requiredAudioRefs = new Set<string>();
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
        requiredAudioRefs.add(audioRef);

        const artifact = contentImport.audioArtifacts.find(
          (candidate) => candidate.id === selectedAudioArtifacts[audioRef],
        );
        if (!artifact || artifact.contentImportId !== importId ||
            artifact.audioScriptSlug !== audioRef || artifact.status !== 'READY') {
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
    if (Object.keys(selectedAudioArtifacts).some((slug) => !requiredAudioRefs.has(slug))) {
      throw new UnprocessableEntityException({
        code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
        message: 'Audio selection contains an unreferenced script.',
        statusCode: 422,
      });
    }

    // 4. Execute publication transaction with PostgreSQL advisory lock
    const published = await this.database.$transaction(async (tx) => {
      if (isTopicSource(contentImport.rawSource)) await lockTopicGroups(tx);
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

      const intermediateTopic = await approvedTopicForPublication(tx, lockedImport);
      const lockedSelectedArtifacts = await tx.audioArtifact.findMany({
        where: { id: { in: selectedIds } },
      });
      for (const audioRef of requiredAudioRefs) {
        const selectedId = selectedAudioArtifacts[audioRef];
        const artifact = lockedSelectedArtifacts.find((candidate) => candidate.id === selectedId);
        const scriptInfo = audioScriptsMap.get(audioRef);
        if (!artifact || !scriptInfo || artifact.contentImportId !== importId ||
            artifact.audioScriptSlug !== audioRef || artifact.status !== 'READY') {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_NOT_READY,
            message: `Selected audio artifact for script "${audioRef}" is not ready`,
            statusCode: 422,
          });
        }
        if (artifact.scriptHash !== scriptInfo.hash) {
          throw new UnprocessableEntityException({
            code: ContentAuthoringErrorCode.AUDIO_SCRIPT_STALE,
            message: `Selected audio artifact for script "${audioRef}" is stale`,
            statusCode: 422,
          });
        }
      }

      // Find or create logical lesson
      const lesson = await tx.lesson.upsert({
        where: { slug: normalizedDraft.slug },
        update: {},
        create: { slug: normalizedDraft.slug },
      });
      // Revision zero means this new import has never been assigned or cleared.
      // Preserve the logical lesson's group until an administrator makes an
      // explicit draft assignment; null with a positive revision means clear.
      const topicGroupId = lockedImport.topicGroupRevision > 0 ? lockedImport.topicGroupId : lesson.topicGroupId;
      // Serialize expression lookup and creation across lessons, including legacy publishers.
      for (const expression of [...new Set(normalizedDraft.wordBanks.flatMap(bank => bank.languageBlocks.map(block => normalizeVocabularyExpression(block.canonicalForm))))].sort()) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`vocabulary:${expression}`}))`;
      }
      const vocabularyReview = intermediateTopic ? await buildVocabularyPublicationReview(tx, lockedImport) : null;
      const vocabularyChoices = vocabularyReview ? validateVocabularyPublicationSelection(vocabularyReview, input.vocabularyReview) : null;

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
        blocks: Array<(typeof normalizedDraft.wordBanks)[number]['languageBlocks'][number] & { id: string }>;
      }> = [];
      const resolvedLanguageSlugs = new Map<string, string>();

      for (const wb of normalizedDraft.wordBanks) {
        const wordBank = await tx.wordBank.upsert({
          where: { slug: wb.slug },
          update: {},
          create: { id: wb.id ?? randomUUID(), slug: wb.slug, name: wb.name },
        });

        const blocks: (typeof wordBankRecords)[number]['blocks'] = [];
        for (const lb of wb.languageBlocks) {
          // A source-local slug can legitimately occur in different word banks.
          // Prefer an already allocated scoped identity so later versions keep mastery IDs stable.
          const scopedSlug = `lb-${wordBank.id}-${lb.slug}`;
          const upsertBlock = (slug: string) => tx.languageBlock.upsert({
            where: { slug },
            update: {},
            create: {
              slug,
              wordBankId: wordBank.id,
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
          const choice = vocabularyChoices?.get(lb.slug);
          let canonical = choice?.action === 'reuse'
            ? await tx.languageBlock.findUnique({ where: { id: choice.languageBlockId } })
            : choice?.action === 'new' ? await upsertBlock(`sense-${randomUUID()}`)
            : await tx.languageBlock.findUnique({ where: { slug: scopedSlug } });
          if (!canonical && choice?.action === 'reuse') throw new ConflictException({ code: 'VOCABULARY_REVIEW_STALE', message: 'The selected meaning no longer exists. Review vocabulary again.' });
          if (!canonical) {
            canonical = await upsertBlock(lb.slug);
            if (canonical.wordBankId !== wordBank.id) canonical = await upsertBlock(scopedSlug);
          }
          if (choice?.action !== 'reuse' && canonical.wordBankId !== wordBank.id) {
            throw new ConflictException({ code: 'LANGUAGE_BLOCK_IDENTITY_CONFLICT',
              message: 'Vocabulary identity is already owned by another word bank.', statusCode: 409 });
          }
          resolvedLanguageSlugs.set(lb.slug, canonical.slug);
          const resolved = { ...lb, id: canonical.id, slug: canonical.slug, ...(choice?.action === 'reuse'
            ? { canonicalForm: canonical.canonicalForm, meaning: canonical.meaning, pronunciation: canonical.pronunciation || lb.pronunciation } : {}) };
          const repeated = blocks.findIndex(block => block.id === canonical.id);
          if (repeated < 0) blocks.push(resolved);
          else {
            const previous = blocks[repeated]!;
            blocks[repeated] = { ...previous, examples: [...new Set([...previous.examples, ...resolved.examples])],
              collocations: [...new Set([...previous.collocations, ...resolved.collocations])], commonErrors: [...new Set([...previous.commonErrors, ...resolved.commonErrors])],
              transferContexts: [...new Set([...previous.transferContexts, ...resolved.transferContexts])] };
          }
        }

        const wbHash = createHash('sha256')
          .update(JSON.stringify(intermediateTopic ? { source: wb, resolved: blocks } : wb))
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

          for (const lb of blocks) {
            await tx.languageBlockVersion.create({
              data: {
                id: randomUUID(),
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

        wordBankRecords.push({ bank: wordBank, versionId: wbVersion.id, wb, blocks });
      }

      // Build UUID-backed snapshot conforming to lessonSnapshotSchema
      const snapshot = {
        ...(intermediateTopic ? { intermediateTopic } : {}),
        ...(normalizedDraft.foundation ? { foundation: normalizedDraft.foundation } : {}),
        title: normalizedDraft.title,
        contentBlocks: normalizedDraft.contentBlocks.map((b) => ({
          id: b.id ?? randomUUID(),
          slug: b.slug,
          type: b.type,
          text: b.text,
          ...(b.audio ? { audio: b.audio } : {}),
        })),
        wordBanks: wordBankRecords.map(({ bank, wb, blocks }) => ({
          id: bank.id,
          slug: wb.slug,
          name: wb.name,
          languageBlocks: blocks.map((lb) => ({
            id: lb.id,
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
            languageBlockReferences: a.languageBlockReferences.map(slug => resolvedLanguageSlugs.get(slug) ?? slug),
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

      if (vocabularyReview && vocabularyChoices) {
        await tx.lessonVocabularyUsage.createMany({ data: vocabularyReview.entries.map(entry => ({
          lessonVersionId: newVersion.id, sourceWordBankSlug: entry.sourceBankSlug, sourceSlug: entry.sourceSlug,
          languageBlockId: wordBankRecords.flatMap(record => record.blocks).find(block => block.slug === resolvedLanguageSlugs.get(entry.sourceSlug))!.id,
          decision: vocabularyChoices.get(entry.sourceSlug)!.action,
          topicGroupId: vocabularyReview.topic?.id ?? null, topicName: vocabularyReview.topic?.name ?? null, topicNameEn: vocabularyReview.topic?.nameEn ?? null,
        })) });
      }

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
      for (const audioRef of requiredAudioRefs) {
        await tx.lessonVersionAudioArtifact.create({
          data: {
            lessonVersionId: newVersion.id,
            audioArtifactId: selectedAudioArtifacts[audioRef]!,
            audioScriptSlug: audioRef,
          },
        });
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
        data: { currentPublishedVersionId: newVersion.id,
          ...(intermediateTopic ? { topicGroupId } : {}) },
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

      if (intermediateTopic) {
        await ensureTopicMission(tx, { id: lesson.id, title: normalizedDraft.title, objective: normalizedDraft.objective });
        await tx.contentImport.updateMany({ where: { lessonId: lesson.id },
          data: { topicGroupId, topicGroupRevision: { increment: 1 } } });
      }

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
    }).catch((error: unknown) => {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code === 'P2003' || code === 'P2025' || code === 'P2034') {
        throw new ConflictException({ code: 'CONTENT_PUBLICATION_CONFLICT',
          message: 'Content or topic group changed concurrently. Refresh before publishing again.', statusCode: 409 });
      }
      throw error;
    });
    await this.pilotMetrics?.recordBestEffort({
      dimensions: { outcome: 'completed' },
      eventType: 'CONTENT_PUBLISHED',
      occurredAt: new Date(published.publishedAt),
      sourceKey: `lesson-version:${published.lessonVersionId}:published`,
    });
    return published;
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
