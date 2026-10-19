import { z } from 'zod';

const text = z.string().max(100_000);
const scalar = text.refine(value => !/[\r\n\u2028\u2029\0]/u.test(value), 'Use a single line; replace line breaks with spaces.');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Use lowercase letters, numbers and hyphens.');
const block = (paragraphs: boolean) => text.refine(value => {
  const normalized = value.replace(/\r\n?/gu, '\n').trim();
  return !normalized.includes('\0') && (paragraphs || !/\n\s*\n/u.test(normalized))
    && !normalized.split('\n').some(line => /^\s*(?:\[|<<<|>>>|FORMAT:|QUESTION:|OPTIONS:|ANSWER:|EXPLANATION:|EVIDENCE:)/u.test(line));
}, 'Remove source control delimiters or unsupported blank paragraphs.');
const question = z.strictObject({ slug, prompt: block(false), options: z.array(scalar).min(2).max(10),
  answerIndex: z.number().int().nonnegative(), explanation: block(false), evidenceLine: z.number().int().positive() });
export const intermediateTopicJsonSchema = z.strictObject({
  format: z.literal('WorkLingoIntermediateTopic/1.0'), slug, title: scalar.trim().min(1), level: scalar, objective: scalar,
  readingText: block(true).trim().min(1), speaker: scalar, activatePrompt: block(false),
  speakingPrompt: block(false), speakingModel: scalar, writingPrompt: block(false), writingModel: scalar,
  languageBlocks: z.array(z.strictObject({ slug, expression: scalar, meaningVi: scalar, pronunciation: scalar,
    grammarPattern: scalar, example: scalar, commonError: scalar,
    collocations: z.array(scalar.refine(value => !value.includes('|'), 'Use separate collocation items instead of a pipe.')).max(100),
  })).min(1).max(100),
  readingQuestions: z.array(question).min(1).max(100), listeningQuestions: z.array(question).min(1).max(100),
}).superRefine((value, context) => {
  const lines = value.readingText.replace(/\r\n?/gu, '\n').split('\n').length;
  const used = new Set(['workplace-language', 'workplace-reading', 'workplace-dialogue', 'workplace-audio', 'activate', 'speaking-response', 'writing-response']);
  for (const key of ['languageBlocks', 'readingQuestions', 'listeningQuestions'] as const) {
    value[key].forEach((item, index) => {
      if (used.has(item.slug)) context.addIssue({ code: 'custom', path: [key, index, 'slug'], message: 'Item slugs must be unique and cannot use a reserved slug.' });
      used.add(item.slug);
    });
  }
  for (const key of ['readingQuestions', 'listeningQuestions'] as const) {
    value[key].forEach((item, index) => {
      if (item.answerIndex >= item.options.length) context.addIssue({ code: 'custom', path: [key, index, 'answerIndex'], message: 'Answer index must refer to an option (starting at 0).' });
      if (item.evidenceLine > lines) context.addIssue({ code: 'custom', path: [key, index, 'evidenceLine'], message: 'Evidence line must exist in the source passage (starting at 1).' });
    });
  }
});
export type IntermediateTopicJson = z.infer<typeof intermediateTopicJsonSchema>;
export const repairTopicJsonRequestSchema = z.strictObject({ source: z.string().min(1).max(200_000) });
export type RepairTopicJsonRequest = z.infer<typeof repairTopicJsonRequestSchema>;
export const topicJsonRepairProposalSchema = z.strictObject({ source: z.string().min(1).max(200_000), explanation: z.string().min(1).max(4000), provider: z.string().min(1), model: z.string().min(1) });
export type TopicJsonRepairProposal = z.infer<typeof topicJsonRepairProposalSchema>;

// Only JSON punctuation may be reconstructed. Never invent a missing primitive.
function tokens(source: string): string[] | null {
  const result: string[] = [];
  const containers: Array<Set<string> | null> = [];
  let previousKey = '';
  for (let index = 0; index < source.length;) {
    const char = source[index]!;
    if (/[\s,:]/u.test(char)) { index++; continue; }
    if (char === '{' || char === '[') { containers.push(char === '{' ? new Set() : null); result.push(char); index++; continue; }
    if (char === '}' || char === ']') {
      if (!containers.length || (char === '}' ? containers.at(-1) === null : containers.at(-1) !== null)) return null;
      containers.pop(); result.push(char); index++; continue;
    }
    if (char === '"') {
      let end = index + 1;
      for (; end < source.length; end++) { if (source[end] === '\\') end++; else if (source[end] === '"') break; }
      if (end >= source.length) return null;
      let value: string;
      try { value = JSON.parse(source.slice(index, end + 1).replace(/\r/gu, '\\r').replace(/\n/gu, '\\n').replace(/\t/gu, '\\t')) as string; }
      catch { return null; }
      const key = /^\s*:/u.test(source.slice(end + 1));
      if (key) {
        const keys = containers.at(-1);
        if (!keys || keys.has(value)) return null;
        keys.add(value);
      }
      const normalized = key ? value : previousKey === 'readingText' ? value.replace(/\r\n?/gu, '\n') : value.replace(/\s+/gu, ' ').trim();
      result.push(JSON.stringify([key ? 'key' : 'string', normalized]));
      previousKey = key ? value : ''; index = end + 1; continue;
    }
    const primitive = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)(?=\s|[}\],:]|$)/u.exec(source.slice(index))?.[0];
    if (!primitive) return null;
    result.push(JSON.stringify(['primitive', JSON.parse(primitive)])); previousKey = ''; index += primitive.length;
  }
  return containers.length ? null : result;
}
export function isSafeTopicJsonRepair(original: string, repaired: string): boolean {
  if (original.length > 200_000 || repaired.length > 200_000) return false;
  const before = tokens(original); const after = tokens(repaired);
  if (!before || !after || before.length !== after.length || before.some((token, index) => token !== after[index])) return false;
  try { return intermediateTopicJsonSchema.safeParse(JSON.parse(repaired)).success; } catch { return false; }
}
export function canAttemptTopicJsonRepair(source: string): boolean {
  if (!source.trim() || source.length > 200_000) return false;
  try {
    const value: unknown = JSON.parse(source);
    const result = intermediateTopicJsonSchema.safeParse(value);
    return !result.success && result.error.issues.every(issue => issue.code === 'custom' && issue.message === 'Use a single line; replace line breaks with spaces.');
  } catch {
    const values = tokens(source);
    return values !== null && Object.keys(intermediateTopicJsonSchema.shape).every(key => values.includes(JSON.stringify(['key', key])));
  }
}
export function applyTopicJsonRepairEdits(source: string, edits: readonly { search: string; replacement: string }[]): string | null {
  if (!edits.length || edits.length > 10) return null;
  let candidate = source;
  for (const edit of edits) {
    const start = candidate.indexOf(edit.search);
    if (!edit.search || start < 0 || candidate.indexOf(edit.search, start + 1) >= 0) return null;
    candidate = candidate.slice(0, start) + edit.replacement + candidate.slice(start + edit.search.length);
    if (candidate.length > 200_000) return null;
  }
  return candidate !== source && isSafeTopicJsonRepair(source, candidate) ? candidate : null;
}
