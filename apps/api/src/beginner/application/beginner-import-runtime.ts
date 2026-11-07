import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ObjectStorage } from '../../storage/domain/object-storage.port.js';
import { ContentImportsService } from '../../content-authoring/application/content-imports.service.js';
import { ContentPublisherService } from '../../content-authoring/application/content-publisher.service.js';
import { FoundationCurriculumService } from '../../curriculum-foundation/application/foundation-curriculum.service.js';
import { AdminCurriculumCommandService } from '../../admin-curriculum/application/admin-curriculum-command.service.js';
import { ProgramVersionsService } from '../../learning-programs/application/program-versions.service.js';
import { VocabularyLibraryService } from '../../vocabulary/vocabulary-library.service.js';
import { BeginnerAuthoringService } from './beginner-authoring.service.js';
import { BeginnerAuthoringPolicy, verifyBeginnerTarget } from '../domain/beginner-authoring-policy.js';
import { readApprovedBeginnerPermission, verifyBeginnerDatabaseIdentity } from '../domain/beginner-environment-preflight.js';

@Module({})
class BeginnerImportRuntimeModule {}
/** A local DI graph joins official application service transactions to the single admission transaction.
 * It imports no HTTP, worker or provider module, and never owns the caller's Prisma lifecycle. */
export async function withBeginnerImportServices<T>(tx: Prisma.TransactionClient, storage: ObjectStorage, execute: (services: { authoring: BeginnerAuthoringService; curriculum: AdminCurriculumCommandService; versions: ProgramVersionsService; vocabulary: VocabularyLibraryService; policy: BeginnerAuthoringPolicy }) => Promise<T>): Promise<T> {
  const joined = new Proxy(tx, { get(target, key) {
    if (key === '$transaction') return (operation: ((client: Prisma.TransactionClient) => unknown) | Promise<unknown>[]) => typeof operation === 'function' ? operation(joined) : Promise.all(operation);
    if (['onModuleInit', 'onModuleDestroy', '$connect', '$disconnect'].includes(String(key))) return undefined;
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const context = await NestFactory.createApplicationContext({ module: BeginnerImportRuntimeModule, providers: [
    { provide: PrismaService, useValue: joined }, { provide: ObjectStorage, useValue: storage },
    ContentImportsService, ContentPublisherService, FoundationCurriculumService, AdminCurriculumCommandService, ProgramVersionsService, VocabularyLibraryService, BeginnerAuthoringService,
    { provide: BeginnerAuthoringPolicy, useFactory: () => new BeginnerAuthoringPolicy({ readPermission: readApprovedBeginnerPermission, verifyTarget: verifyBeginnerTarget, verifyEnvironment: verifyBeginnerDatabaseIdentity }) },
  ] }, { logger: false, abortOnError: false });
  try { return await execute({ authoring: context.get(BeginnerAuthoringService), curriculum: context.get(AdminCurriculumCommandService), versions: context.get(ProgramVersionsService), vocabulary: context.get(VocabularyLibraryService), policy: context.get(BeginnerAuthoringPolicy) }); }
  finally { await context.close(); }
}
