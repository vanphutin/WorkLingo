import type { LessonDocumentNode } from './ast.js';
import type { ContentIssue } from './issues.js';

export const foundationCategories = ['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'] as const;
export type FoundationCategory = typeof foundationCategories[number];
export interface FoundationMetadata {
  readonly category: FoundationCategory;
  readonly templateId: string;
  readonly templateVersion: 1;
  readonly objectives: readonly { slug: string; statement: string; skills: readonly string[]; required: boolean }[];
  readonly activityObjectives: Readonly<Record<string, readonly string[]>>;
  readonly responseRubrics: Readonly<Record<string, string>>;
}

const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const skills = new Set(['reading', 'listening', 'speaking', 'writing']);
const filled = (value: string | undefined): boolean => Boolean(value?.trim()) && !/\bTODO\b|\bTBD\b|\{\{/iu.test(value!);

export function validateFoundation(document: LessonDocumentNode): ContentIssue[] {
  if (document.formatVersion !== 'WorkLingoLesson/1.1') return [];
  const issues: ContentIssue[] = [];
  const fail = (code: string, message: string, range: LessonDocumentNode['range'], path: string) => {
    issues.push({ code, message, range, path, severity: 'error' });
  };
  const foundation = document.foundation;
  if (document.lesson && (!filled(document.lesson.title) || !filled(document.lesson.objective))) {
    fail('VAL_INCOMPLETE_TEMPLATE', 'Replace lesson title/objective scaffold markers', document.lesson.range, 'lesson');
  }
  for (const bank of document.wordBanks) {
    if (!filled(bank.title)) fail('VAL_INCOMPLETE_TEMPLATE', 'Author a word bank title', bank.range, `word_bank.${bank.slug}`);
    for (const block of bank.languageBlocks) {
      if (!filled(block.pronunciation) || !filled(block.grammarPattern) || !block.examples.length || block.examples.some((e) => !filled(e))) {
        fail('VAL_ASSESSMENT_REQUIRED', 'Language blocks need pronunciation, grammar pattern and contextual examples', block.range, `language_block.${block.slug}`);
      }
    }
  }
  if (!foundation || !foundationCategories.includes(foundation.category as FoundationCategory) ||
    !identifier.test(foundation.templateId) || foundation.templateVersion !== 1) {
    fail('VAL_INVALID_FOUNDATION', 'Foundation requires a known category, kebab-case template_id and template_version 1', foundation?.range ?? document.range, 'foundation');
  }
  const objectives = document.objectives ?? [];
  if (!objectives.length || objectives.length > 50 || !objectives.some((o) => o.required === 'true')) {
    fail('VAL_INVALID_OBJECTIVE', 'Define 1–50 objectives including at least one required objective', document.range, 'objectives');
  }
  const known = new Set<string>();
  for (const objective of objectives) {
    if (!identifier.test(objective.slug) || known.has(objective.slug) || !filled(objective.statement) || objective.statement.length > 1000 ||
      !['true', 'false'].includes(objective.required) || !objective.skills.length || objective.skills.length > 4 ||
      new Set(objective.skills).size !== objective.skills.length || objective.skills.some((s) => !skills.has(s))) {
      fail('VAL_INVALID_OBJECTIVE', 'Objective requires unique slug, statement, valid skills and literal true/false required', objective.range, `objectives.${objective.slug}`);
    }
    known.add(objective.slug);
    const assessed = new Set(document.activities.filter((a) => a.objectiveRefs?.includes(objective.slug)).map((a) => a.activityType));
    if (objective.required === 'true' && objective.skills.some((s) => !assessed.has(s))) {
      fail('VAL_UNASSESSED_OBJECTIVE', 'Each required objective skill needs an activity of that type', objective.range, `objectives.${objective.slug}`);
    }
  }
  for (const activity of document.activities) {
    const path = `activities.${activity.slug}`;
    const refs = activity.objectiveRefs ?? [];
    if (!refs.length || refs.length > 50 || new Set(refs).size !== refs.length || refs.some((ref) => !known.has(ref))) {
      fail('VAL_UNKNOWN_OBJECTIVE', 'Declare unique references to existing lesson objectives', activity.range, `${path}.objective_refs`);
    }
    const comprehension = ['reading', 'listening'].includes(activity.activityType);
    const validResponse = comprehension ? activity.responseType === 'multiple_choice'
      : activity.responseType === (activity.activityType === 'speaking' ? 'shadowing' : 'short_text');
    if (!validResponse || !filled(activity.question) || !activity.contentRefs.length || !activity.languageBlockRefs.length ||
      (comprehension ? !filled(activity.explanation) || !activity.evidence.length || activity.options.some((o) => !filled(o.text))
        : !filled(activity.prompt) || !filled(activity.rubric))) {
      fail('VAL_ASSESSMENT_REQUIRED', 'Complete question, references and supported response; comprehension needs explanation/evidence, responses need model prompt/rubric', activity.range, path);
    }
    for (const evidence of activity.evidence) {
      const match = /^([a-z0-9]+(?:-[a-z0-9]+)*):([1-9][0-9]*)$/u.exec(evidence);
      const slug = match?.[1];
      const target = activity.activityType === 'listening'
        ? document.audioScripts.find((a) => a.slug === slug && a.slug === activity.audioRef)?.script
        : document.contents.find((c) => c.slug === slug && activity.contentRefs.includes(c.slug))?.text;
      if (!match || !target || Number(match[2]) > target.split('\n').length) {
        fail('VAL_INVALID_EVIDENCE', 'Evidence must reference an exact line in the activity content or listening script', activity.range, `${path}.evidence`);
      }
    }
  }
  // Scaffolds deliberately use TODO markers, including inside content and vocabulary.
  for (const node of [...document.contents.map((c) => ({ ...c, value: c.text })),
    ...document.audioScripts.map((a) => ({ ...a, value: a.script })),
    ...document.wordBanks.flatMap((b) => b.languageBlocks.map((l) => ({ ...l, value: [l.expression, l.meaningVi, l.pronunciation, l.grammarPattern, ...l.examples].join('\n') })))]) {
    if (!filled(node.value)) fail('VAL_INCOMPLETE_TEMPLATE', 'Replace scaffold markers with authored content', node.range, node.slug);
  }
  return issues;
}

export function normalizeFoundation(document: LessonDocumentNode): FoundationMetadata | undefined {
  if (document.formatVersion !== 'WorkLingoLesson/1.1' || !document.foundation) return undefined;
  return {
    category: document.foundation.category as FoundationCategory,
    templateId: document.foundation.templateId, templateVersion: 1,
    objectives: (document.objectives ?? []).map(({ slug, statement, skills, required }) => ({ slug, statement, skills: [...skills], required: required === 'true' })),
    activityObjectives: Object.fromEntries(document.activities.map((a) => [a.slug, [...a.objectiveRefs ?? []]])),
    responseRubrics: Object.fromEntries(document.activities.filter((a) => a.rubric).map((a) => [a.slug, a.rubric!])),
  };
}
