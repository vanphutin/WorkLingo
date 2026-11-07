import { Test } from '@nestjs/testing';
import { describe, it, expect } from 'vitest';
import { BeginnerProgramImportService } from './beginner-program-import.service.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { reconcileBeginnerSources } from '../domain/beginner-program-source.js';
import path from 'node:path';

describe('R2.1 import preflight before writes', () => {
  it('rejects a changed reviewed dry-run before attempting any write', async () => {
    const source = await reconcileBeginnerSources(path.resolve('../..'));
    const evidence = source.vocabularyEvidence.snapshot;
    const database = { learningProgram: { findUnique: async () => null }, ...Object.fromEntries(Object.entries({ vocabularySource: 'sources', vocabularyDocument: 'documents', lexicalEntry: 'entries', lexicalSense: 'senses', lexicalPronunciation: 'pronunciations', lexicalCefrAssociation: 'cefr', vocabularySourceEntry: 'occurrences' }).map(([model, key]) => [model, { findMany: async () => evidence[key as keyof typeof evidence] }])) };
    const module = await Test.createTestingModule({ providers: [BeginnerProgramImportService, { provide: PrismaService, useValue: database }] }).compile();
    const service = module.get(BeginnerProgramImportService);
    const dryRun = await service.dryRun(source);
    expect(dryRun.existingReleases).toEqual([]);
    await expect(service.apply(source, 'b'.repeat(64))).rejects.toThrow('BEGINNER_DRY_RUN_CHANGED');
    await module.close();
  });
});
