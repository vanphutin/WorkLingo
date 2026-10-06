import type { SourceRange } from './source-location.js';

export interface AstNode {
  readonly range: SourceRange;
}

export interface LessonNode extends AstNode {
  readonly kind: 'lesson';
  readonly slug: string;
  readonly title: string;
  readonly level: string;
  readonly durationMinutes: number;
  readonly objective: string;
}

export interface LanguageBlockNode extends AstNode {
  readonly kind: 'language_block';
  readonly slug: string;
  readonly expression: string;
  readonly meaningVi: string;
  readonly pronunciation?: string | undefined;
  readonly collocations: readonly string[];
  readonly grammarPattern?: string | undefined;
  readonly examples: readonly string[];
  readonly commonErrors: readonly string[];
}

export interface WordBankNode extends AstNode {
  readonly kind: 'word_bank';
  readonly slug: string;
  readonly title: string;
  readonly languageBlocks: readonly LanguageBlockNode[];
}

export interface ContentNode extends AstNode {
  readonly kind: 'content';
  readonly slug: string;
  readonly type: string;
  readonly text: string;
}

export interface AudioScriptNode extends AstNode {
  readonly kind: 'audio_script';
  readonly slug: string;
  readonly speaker?: string | undefined;
  readonly script: string;
}

export interface ActivityOptionNode extends AstNode {
  readonly label: string;
  readonly text: string;
}

export type LearningBlockType = 'activate' | 'read_decode' | 'listen_reason' | 'respond';
export type ActivityType = 'reading' | 'listening' | 'speaking' | 'writing';
export type ResponseType = 'multiple_choice' | 'short_text' | 'shadowing';

export interface ActivityNode extends AstNode {
  readonly kind: 'activity';
  readonly slug: string;
  readonly learningBlock: string;
  readonly activityType: string;
  readonly responseType: string;
  readonly skills: readonly string[];
  readonly contentRefs: readonly string[];
  readonly languageBlockRefs: readonly string[];
  readonly audioRef?: string | undefined;
  readonly question?: string | undefined;
  readonly options: readonly ActivityOptionNode[];
  readonly answer?: string | undefined;
  readonly explanation?: string | undefined;
  readonly evidence: readonly string[];
  readonly rubric?: string | undefined;
  readonly prompt?: string | undefined;
}

export interface LessonDocumentNode extends AstNode {
  readonly kind: 'document';
  readonly formatVersion: string;
  readonly lesson?: LessonNode | undefined;
  readonly wordBanks: readonly WordBankNode[];
  readonly contents: readonly ContentNode[];
  readonly audioScripts: readonly AudioScriptNode[];
  readonly activities: readonly ActivityNode[];
}
