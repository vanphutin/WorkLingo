import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { VocabularyController } from './vocabulary.controller.js';
import { VocabularySourcesService } from './vocabulary-sources.service.js';
import { VocabularyImportsService } from './vocabulary-imports.service.js';
import { VocabularyLibraryService } from './vocabulary-library.service.js';

@Module({ imports: [DatabaseModule], controllers: [VocabularyController], providers: [VocabularySourcesService, VocabularyImportsService, VocabularyLibraryService] })
export class VocabularyModule {}
