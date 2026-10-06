import type {
  ContentNode,
  LanguageBlockNode,
  LessonDocumentNode,
} from './ast.js';
import type { ContentIssue } from './issues.js';
import { parseLessonSource } from './parser.js';
import type { NormalizedLessonDraft } from './normalizer.js';
import { normalizeLessonDocument } from './normalizer.js';

export const PARSER_VERSION = '1.0.0';

export interface ValidationResult {
  readonly issues: readonly ContentIssue[];
  readonly canPublish: boolean;
}

export interface ContentAnalysis {
  readonly parserVersion: string;
  readonly issues: readonly ContentIssue[];
  readonly issuesTruncated: boolean;
  readonly canPublish: boolean;
  readonly normalizedDraft: NormalizedLessonDraft | null;
}

const MAX_SOURCE_LENGTH = 500_000;
const MAX_SECTIONS = 200;
const MAX_ACTIVITIES = 50;
const MAX_OPTIONS = 10;

const VALID_LEARNING_BLOCKS = new Set(['activate', 'read_decode', 'listen_reason', 'respond']);
const VALID_ACTIVITY_TYPES = new Set(['reading', 'listening', 'speaking', 'writing']);
const VALID_RESPONSE_TYPES = new Set(['multiple_choice', 'short_text', 'shadowing']);
const VALID_CONTENT_TYPES = new Set(['email', 'dialogue']);

export function validateLessonDocument(
  document: LessonDocumentNode,
  options?: { maxIssues?: number },
): ValidationResult {
  const issues: ContentIssue[] = [];
  const maxIssues = options?.maxIssues ?? 100;

  function addIssue(
    code: string,
    message: string,
    severity: 'error' | 'warning',
    nodeRange: typeof document.range,
    path?: string,
    suggestion?: string,
  ): void {
    if (issues.length >= maxIssues) return;
    issues.push({
      code,
      severity,
      message,
      range: nodeRange,
      path,
      suggestion,
    });
  }

  // Check section limits
  const totalSections =
    (document.lesson ? 1 : 0) +
    document.wordBanks.length +
    document.contents.length +
    document.audioScripts.length +
    document.activities.length;

  if (totalSections > MAX_SECTIONS) {
    addIssue(
      'VAL_LIMIT_EXCEEDED',
      `Document contains ${totalSections} sections, exceeding maximum limit of ${MAX_SECTIONS}`,
      'error',
      document.range,
      'sections',
    );
  }

  if (document.activities.length > MAX_ACTIVITIES) {
    addIssue(
      'VAL_LIMIT_EXCEEDED',
      `Document contains ${document.activities.length} activities, exceeding maximum limit of ${MAX_ACTIVITIES}`,
      'error',
      document.range,
      'activities',
    );
  }

  // Validate [LESSON]
  if (!document.lesson) {
    addIssue('VAL_MISSING_LESSON', 'Document is missing required [LESSON] section', 'error', document.range, 'lesson');
  } else {
    const l = document.lesson;
    if (!l.slug) {
      addIssue('VAL_REQUIRED_FIELD', "Lesson 'slug' is required", 'error', l.range, 'lesson.slug');
    }
    if (!l.title) {
      addIssue('VAL_REQUIRED_FIELD', "Lesson 'title' is required", 'error', l.range, 'lesson.title');
    }
    if (!l.level) {
      addIssue('VAL_REQUIRED_FIELD', "Lesson 'level' is required", 'error', l.range, 'lesson.level');
    }
    if (!l.durationMinutes || l.durationMinutes <= 0) {
      addIssue('VAL_REQUIRED_FIELD', "Lesson 'duration_minutes' must be a positive integer", 'error', l.range, 'lesson.duration_minutes');
    }
    if (!l.objective) {
      addIssue('VAL_REQUIRED_FIELD', "Lesson 'objective' is required", 'error', l.range, 'lesson.objective');
    }
  }

  // Duplicate slug tracking across sections
  const seenSlugs = new Map<string, string>(); // slug -> section kind

  function trackSlug(slug: string, kind: string, range: typeof document.range): void {
    if (!slug) return;
    const existing = seenSlugs.get(slug);
    if (existing) {
      addIssue(
        'VAL_DUPLICATE_SLUG',
        `Duplicate identifier '${slug}' already used in ${existing}`,
        'error',
        range,
        `${kind}.${slug}`,
      );
    } else {
      seenSlugs.set(slug, kind);
    }
  }

  if (document.lesson?.slug) {
    trackSlug(document.lesson.slug, 'lesson', document.lesson.range);
  }

  // Collect references and slugs
  const wordBankSlugs = new Set<string>();
  const languageBlockMap = new Map<string, LanguageBlockNode>();
  const contentMap = new Map<string, ContentNode>();
  const audioScriptMap = new Map<string, typeof document.audioScripts[number]>();

  // Word banks
  for (const wb of document.wordBanks) {
    trackSlug(wb.slug, 'word_bank', wb.range);
    wordBankSlugs.add(wb.slug);
    if (!wb.title) {
      addIssue('VAL_REQUIRED_FIELD', "Word Bank 'title' is required", 'error', wb.range, `word_bank.${wb.slug}.title`);
    }
    if (wb.languageBlocks.length === 0) {
      addIssue(
        'VAL_EMPTY_SECTION',
        `Word Bank '${wb.slug}' must contain at least one LANGUAGE_BLOCK`,
        'error',
        wb.range,
        `word_bank.${wb.slug}`,
      );
    }
    for (const lb of wb.languageBlocks) {
      trackSlug(lb.slug, 'language_block', lb.range);
      languageBlockMap.set(lb.slug, lb);
      if (!lb.expression) {
        addIssue('VAL_REQUIRED_FIELD', "Language Block 'expression' is required", 'error', lb.range, `language_block.${lb.slug}.expression`);
      }
      if (!lb.meaningVi) {
        addIssue('VAL_REQUIRED_FIELD', "Language Block 'meaning_vi' is required", 'error', lb.range, `language_block.${lb.slug}.meaning_vi`);
      }
    }
  }

  // Contents
  for (const c of document.contents) {
    trackSlug(c.slug, 'content', c.range);
    contentMap.set(c.slug, c);
    if (!VALID_CONTENT_TYPES.has(c.type)) {
      addIssue(
        'VAL_INVALID_ENUM',
        `Invalid content type '${c.type}'. Supported types: ${[...VALID_CONTENT_TYPES].join(', ')}`,
        'error',
        c.range,
        `content.${c.slug}.type`,
      );
    }
    if (!c.text) {
      addIssue('VAL_REQUIRED_FIELD', "Content 'text' is required", 'error', c.range, `content.${c.slug}.text`);
    }
  }

  // Audio scripts
  for (const as of document.audioScripts) {
    trackSlug(as.slug, 'audio_script', as.range);
    audioScriptMap.set(as.slug, as);
    if (!as.script) {
      addIssue('VAL_REQUIRED_FIELD', "Audio script 'script' is required", 'error', as.range, `audio_script.${as.slug}.script`);
    }
  }

  // Activities
  const usedContentRefs = new Set<string>();
  const usedLanguageBlockRefs = new Set<string>();
  const usedAudioRefs = new Set<string>();
  const coveredSkills = new Set<string>();

  for (const act of document.activities) {
    trackSlug(act.slug, 'activity', act.range);

    // Validate enums
    if (!VALID_LEARNING_BLOCKS.has(act.learningBlock)) {
      addIssue(
        'VAL_INVALID_ENUM',
        `Invalid learning_block '${act.learningBlock}'. Supported: ${[...VALID_LEARNING_BLOCKS].join(', ')}`,
        'error',
        act.range,
        `activities.${act.slug}.learning_block`,
      );
    }
    if (!VALID_ACTIVITY_TYPES.has(act.activityType)) {
      addIssue(
        'VAL_INVALID_ENUM',
        `Invalid activity_type '${act.activityType}'. Supported: ${[...VALID_ACTIVITY_TYPES].join(', ')}`,
        'error',
        act.range,
        `activities.${act.slug}.activity_type`,
      );
    }
    if (!VALID_RESPONSE_TYPES.has(act.responseType)) {
      addIssue(
        'VAL_INVALID_ENUM',
        `Invalid response_type '${act.responseType}'. Supported: ${[...VALID_RESPONSE_TYPES].join(', ')}`,
        'error',
        act.range,
        `activities.${act.slug}.response_type`,
      );
    }

    // Skills
    for (const skill of act.skills) {
      if (!VALID_ACTIVITY_TYPES.has(skill)) {
        addIssue(
          'VAL_INVALID_ENUM',
          `Invalid skill '${skill}' in activity '${act.slug}'`,
          'error',
          act.range,
          `activities.${act.slug}.skills`,
        );
      }
      coveredSkills.add(skill);
    }
    if (act.activityType && !act.skills.includes(act.activityType)) {
      addIssue(
        'VAL_MISSING_ACTIVITY_SKILL',
        `Activity '${act.slug}' must include its own activity_type '${act.activityType}' in skills`,
        'error',
        act.range,
        `activities.${act.slug}.skills`,
      );
    }

    // Incompatible block checks
    if (act.learningBlock === 'read_decode' && act.activityType !== 'reading') {
      addIssue(
        'VAL_INCOMPATIBLE_BLOCK',
        `Activity '${act.slug}' with type '${act.activityType}' is incompatible with learning block 'read_decode'`,
        'error',
        act.range,
        `activities.${act.slug}.learning_block`,
      );
    }
    if (act.learningBlock === 'listen_reason' && act.activityType !== 'listening') {
      addIssue(
        'VAL_INCOMPATIBLE_BLOCK',
        `Activity '${act.slug}' with type '${act.activityType}' is incompatible with learning block 'listen_reason'`,
        'error',
        act.range,
        `activities.${act.slug}.learning_block`,
      );
    }
    if (act.learningBlock === 'respond' && act.activityType !== 'speaking' && act.activityType !== 'writing') {
      addIssue(
        'VAL_INCOMPATIBLE_BLOCK',
        `Activity '${act.slug}' with type '${act.activityType}' is incompatible with learning block 'respond'`,
        'error',
        act.range,
        `activities.${act.slug}.learning_block`,
      );
    }

    // Content refs
    for (const cRef of act.contentRefs) {
      if (!contentMap.has(cRef)) {
        addIssue(
          'VAL_MISSING_CONTENT_REF',
          `Activity '${act.slug}' references non-existent content '${cRef}'`,
          'error',
          act.range,
          `activities.${act.slug}.content_refs`,
        );
      } else {
        usedContentRefs.add(cRef);
      }
    }

    // Language block refs
    for (const lbRef of act.languageBlockRefs) {
      if (!languageBlockMap.has(lbRef)) {
        addIssue(
          'VAL_MISSING_LANGUAGE_BLOCK_REF',
          `Activity '${act.slug}' references non-existent language block '${lbRef}'`,
          'error',
          act.range,
          `activities.${act.slug}.language_block_refs`,
        );
      } else {
        usedLanguageBlockRefs.add(lbRef);
      }
    }

    // Audio ref for listening
    if (act.activityType === 'listening') {
      if (!act.audioRef) {
        addIssue(
          'VAL_MISSING_AUDIO_REF',
          `Listening activity '${act.slug}' must declare an audio_ref`,
          'error',
          act.range,
          `activities.${act.slug}.audio_ref`,
        );
      } else if (!audioScriptMap.has(act.audioRef)) {
        addIssue(
          'VAL_MISSING_AUDIO_REF',
          `Listening activity '${act.slug}' references non-existent audio script '${act.audioRef}'`,
          'error',
          act.range,
          `activities.${act.slug}.audio_ref`,
        );
      } else {
        usedAudioRefs.add(act.audioRef);
      }
    }

    // Response type specific validation
    if (act.responseType === 'multiple_choice') {
      if (act.options.length < 2) {
        addIssue(
          'VAL_INSUFFICIENT_OPTIONS',
          `Multiple choice activity '${act.slug}' must have at least 2 options`,
          'error',
          act.range,
          `activities.${act.slug}.options`,
        );
      }
      if (act.options.length > MAX_OPTIONS) {
        addIssue(
          'VAL_LIMIT_EXCEEDED',
          `Multiple choice activity '${act.slug}' has ${act.options.length} options, exceeding maximum of ${MAX_OPTIONS}`,
          'error',
          act.range,
          `activities.${act.slug}.options`,
        );
      }

      const optionLabels = new Set(act.options.map((o) => o.label));
      if (!act.answer || !optionLabels.has(act.answer)) {
        addIssue(
          'VAL_INVALID_ANSWER',
          `Activity '${act.slug}' has invalid answer '${act.answer ?? ''}'. Must be one of: ${[...optionLabels].join(', ')}`,
          'error',
          act.range,
          `activities.${act.slug}.answer`,
        );
      }

      if (!act.explanation) {
        addIssue(
          'WARN_RECOMMENDED_EXPLANATION',
          `Activity '${act.slug}' is missing recommended explanation`,
          'warning',
          act.range,
          `activities.${act.slug}.explanation`,
        );
      }

      if (act.activityType === 'reading' && act.evidence.length === 0) {
        addIssue(
          'WARN_RECOMMENDED_EVIDENCE',
          `Reading comprehension activity '${act.slug}' is missing recommended evidence reference`,
          'warning',
          act.range,
          `activities.${act.slug}.evidence`,
        );
      }
    }

    // Evidence checks
    for (const ev of act.evidence) {
      const parts = ev.split(':');
      const cSlug = parts[0]!;
      const lineNumStr = parts[1];
      const targetContent = contentMap.get(cSlug);

      if (!targetContent) {
        addIssue(
          'VAL_INVALID_EVIDENCE',
          `Evidence '${ev}' references non-existent content '${cSlug}'`,
          'error',
          act.range,
          `activities.${act.slug}.evidence`,
        );
      } else if (lineNumStr !== undefined) {
        const lineNum = parseInt(lineNumStr, 10);
        const contentLines = targetContent.text.split('\n');
        if (isNaN(lineNum) || lineNum < 1 || lineNum > contentLines.length) {
          addIssue(
            'VAL_INVALID_EVIDENCE',
            `Evidence '${ev}' line number ${lineNumStr} is out of range for content '${cSlug}' (${contentLines.length} lines)`,
            'error',
            act.range,
            `activities.${act.slug}.evidence`,
          );
        }
      }
    }
  }

  // Four-skill coverage check
  const requiredSkills = ['reading', 'listening', 'speaking', 'writing'];
  const missingSkills = requiredSkills.filter((s) => !coveredSkills.has(s));
  if (missingSkills.length > 0) {
    addIssue(
      'VAL_MISSING_SKILL_COVERAGE',
      `Lesson activities do not cover all four skills. Missing: ${missingSkills.join(', ')}`,
      'error',
      document.range,
      'activities',
    );
  }

  // Unused warnings
  for (const c of document.contents) {
    if (!usedContentRefs.has(c.slug)) {
      addIssue(
        'WARN_UNUSED_CONTENT',
        `Content block '${c.slug}' is never referenced by any activity`,
        'warning',
        c.range,
        `content.${c.slug}`,
      );
    }
  }

  for (const as of document.audioScripts) {
    if (!usedAudioRefs.has(as.slug)) {
      addIssue(
        'WARN_UNUSED_AUDIO_SCRIPT',
        `Audio script '${as.slug}' is never referenced by any listening activity`,
        'warning',
        as.range,
        `audio_script.${as.slug}`,
      );
    }
  }

  for (const [slug, lb] of languageBlockMap) {
    if (!usedLanguageBlockRefs.has(slug)) {
      addIssue(
        'WARN_UNUSED_LANGUAGE_BLOCK',
        `Language block '${slug}' is never referenced by any activity`,
        'warning',
        lb.range,
        `language_block.${slug}`,
      );
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  return {
    issues,
    canPublish: errors.length === 0,
  };
}

export function analyzeLessonSource(
  source: string,
  options?: { maxIssues?: number },
): ContentAnalysis {
  const maxIssues = options?.maxIssues ?? 100;
  const issues: ContentIssue[] = [];

  if (source.length > MAX_SOURCE_LENGTH) {
    issues.push({
      code: 'VAL_LIMIT_EXCEEDED',
      severity: 'error',
      message: `Source length ${source.length} exceeds maximum limit of ${MAX_SOURCE_LENGTH}`,
      range: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: source.length },
      },
      path: 'source',
    });
  }

  const parseRes = parseLessonSource(source);
  const valRes = validateLessonDocument(parseRes.document, { maxIssues });

  const allIssues = [...issues, ...parseRes.issues, ...valRes.issues];
  const issuesTruncated = allIssues.length > maxIssues;
  const returnedIssues = issuesTruncated ? allIssues.slice(0, maxIssues) : allIssues;
  const canPublish = !allIssues.some((i) => i.severity === 'error');

  const normalizedDraft = canPublish
    ? normalizeLessonDocument(parseRes.document)
    : null;

  return {
    parserVersion: PARSER_VERSION,
    issues: returnedIssues,
    issuesTruncated,
    canPublish,
    normalizedDraft,
  };
}
