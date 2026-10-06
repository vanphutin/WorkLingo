import type {
  LanguageBlockNode,
  LessonDocumentNode,
} from './ast.js';
import { validateLessonDocument } from './validator.js';

export interface NormalizedContentBlock {
  readonly id?: string | undefined;
  readonly slug: string;
  readonly type: 'email' | 'dialogue';
  readonly text: string;
  readonly audio?: {
    readonly kind: 'textPlaceholder';
    readonly notice: string;
  } | undefined;
}

export interface NormalizedLanguageBlock {
  readonly id?: string | undefined;
  readonly slug: string;
  readonly canonicalForm: string;
  readonly meaning: string;
  readonly pronunciation: string;
  readonly collocations: readonly string[];
  readonly grammarPattern: string;
  readonly examples: readonly string[];
  readonly commonErrors: readonly string[];
  readonly cefrLevel: string;
  readonly transferContexts: readonly string[];
}

export interface NormalizedWordBank {
  readonly id?: string | undefined;
  readonly slug: string;
  readonly name: string;
  readonly languageBlocks: readonly NormalizedLanguageBlock[];
}

export interface NormalizedActivityQuestion {
  readonly slug: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  readonly explanation: string;
  readonly evidence: string;
}

export interface NormalizedComprehensionPayload {
  readonly prompt: string;
  readonly questions: readonly NormalizedActivityQuestion[];
}

export interface NormalizedResponsePayload {
  readonly prompt: string;
  readonly sampleAnswer: string;
  readonly requiredPhrases: readonly string[];
  readonly minWords: number;
  readonly mode?: 'shadowing' | undefined;
}

export interface NormalizedActivity {
  readonly id?: string | undefined;
  readonly slug: string;
  readonly order: number;
  readonly learningBlock: 'activate' | 'readDecode' | 'listenReason' | 'respond';
  readonly activityType: 'reading' | 'listening' | 'speaking' | 'writing';
  readonly skills: readonly ('reading' | 'listening' | 'speaking' | 'writing')[];
  readonly contentReferences: readonly string[];
  readonly languageBlockReferences: readonly string[];
  readonly payload: NormalizedComprehensionPayload | NormalizedResponsePayload;
}

export interface NormalizedAudioScript {
  readonly slug: string;
  readonly speaker?: string | undefined;
  readonly script: string;
}

export interface NormalizedLessonDraft {
  readonly slug: string;
  readonly title: string;
  readonly level: string;
  readonly durationMinutes: number;
  readonly objective: string;
  readonly contentBlocks: readonly NormalizedContentBlock[];
  readonly wordBanks: readonly NormalizedWordBank[];
  readonly activities: readonly NormalizedActivity[];
  readonly audioScripts?: readonly NormalizedAudioScript[] | undefined;
}

function mapLearningBlock(raw: string): 'activate' | 'readDecode' | 'listenReason' | 'respond' {
  switch (raw) {
    case 'read_decode':
      return 'readDecode';
    case 'listen_reason':
      return 'listenReason';
    case 'activate':
      return 'activate';
    case 'respond':
    default:
      return 'respond';
  }
}

export function normalizeLessonDocument(
  document: LessonDocumentNode,
): NormalizedLessonDraft | null {
  const valResult = validateLessonDocument(document);
  if (!valResult.canPublish) {
    return null;
  }

  const lesson = document.lesson!;

  // Build lookup maps
  const langBlockMap = new Map<string, LanguageBlockNode>();
  for (const wb of document.wordBanks) {
    for (const lb of wb.languageBlocks) {
      langBlockMap.set(lb.slug, lb);
    }
  }

  // Word banks
  const wordBanks: NormalizedWordBank[] = document.wordBanks.map((wb) => ({
    slug: wb.slug,
    name: wb.title,
    languageBlocks: wb.languageBlocks.map((lb) => ({
      slug: lb.slug,
      canonicalForm: lb.expression,
      meaning: lb.meaningVi,
      pronunciation: lb.pronunciation ?? '',
      collocations: [...lb.collocations],
      grammarPattern: lb.grammarPattern ?? '',
      examples: [...lb.examples],
      commonErrors: [...lb.commonErrors],
      cefrLevel: lesson.level || 'foundation',
      transferContexts: [lesson.title || 'Workplace context'],
    })),
  }));

  // Content blocks
  const contentBlocks: NormalizedContentBlock[] = document.contents.map((c) => ({
    slug: c.slug,
    type: c.type as 'email' | 'dialogue',
    text: c.text,
  }));

  // Audio scripts
  const audioScripts: NormalizedAudioScript[] = document.audioScripts.map((as) => ({
    slug: as.slug,
    speaker: as.speaker,
    script: as.script,
  }));

  // Activities
  const activities: NormalizedActivity[] = document.activities.map((act, index) => {
    const learningBlock = mapLearningBlock(act.learningBlock);
    const activityType = act.activityType as 'reading' | 'listening' | 'speaking' | 'writing';
    const skills = act.skills as ('reading' | 'listening' | 'speaking' | 'writing')[];

    const contentReferences =
      act.contentRefs.length > 0
        ? [...act.contentRefs]
        : document.contents.length > 0
          ? [document.contents[0]!.slug]
          : [];

    const languageBlockReferences = [...act.languageBlockRefs];

    let payload: NormalizedComprehensionPayload | NormalizedResponsePayload;

    if (activityType === 'reading' || activityType === 'listening') {
      const optIndex = act.options.findIndex((o) => o.label === act.answer);
      const answerIndex = optIndex !== -1 ? optIndex : (act.answer ? act.answer.charCodeAt(0) - 65 : 0);

      payload = {
        prompt: act.prompt || act.question || 'Comprehension prompt',
        questions: [
          {
            slug: `${act.slug}-q1`,
            prompt: act.question || act.prompt || 'Question',
            options: act.options.map((o) => o.text),
            answerIndex,
            explanation: act.explanation || 'See lesson content for explanation.',
            evidence:
              act.evidence.join('; ') ||
              (act.audioRef
                ? `${act.audioRef}:1`
                : act.contentRefs[0]
                  ? `${act.contentRefs[0]}:1`
                  : 'Context evidence'),
          },
        ],
      };
    } else if (activityType === 'speaking') {
      let sampleAnswer = act.prompt || act.question || 'Sample answer';
      const quoteMatch = sampleAnswer.match(/"([^"]+)"/);
      if (quoteMatch) {
        sampleAnswer = quoteMatch[1]!;
      }
      const phrases = act.languageBlockRefs.map(
        (ref) => langBlockMap.get(ref)?.expression || ref,
      );

      payload = {
        prompt: act.question || act.prompt || 'Speaking prompt',
        sampleAnswer,
        requiredPhrases: phrases.length > 0 ? phrases : [sampleAnswer],
        minWords: Math.max(4, sampleAnswer.split(/\s+/).length),
        mode: act.responseType === 'shadowing' ? 'shadowing' : undefined,
      };
    } else {
      // writing
      const sampleAnswer = act.prompt || act.question || 'Sample answer';
      const phrases = act.languageBlockRefs.map(
        (ref) => langBlockMap.get(ref)?.expression || ref,
      );

      payload = {
        prompt: act.question || act.prompt || 'Writing prompt',
        sampleAnswer,
        requiredPhrases: phrases.length > 0 ? phrases : [sampleAnswer],
        minWords: 4,
      };
    }

    return {
      slug: act.slug,
      order: index,
      learningBlock,
      activityType,
      skills,
      contentReferences,
      languageBlockReferences,
      payload,
    };
  });

  return {
    slug: lesson.slug,
    title: lesson.title,
    level: lesson.level,
    durationMinutes: lesson.durationMinutes,
    objective: lesson.objective,
    contentBlocks,
    wordBanks,
    activities,
    audioScripts: audioScripts.length > 0 ? audioScripts : undefined,
  };
}
