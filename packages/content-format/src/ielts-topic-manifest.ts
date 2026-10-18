export type IeltsTopicDifficulty = 'foundation' | 'developing' | 'competent' | 'advanced';
export interface IeltsTopicPack {
  slug: string;
  difficulty: IeltsTopicDifficulty;
  curriculumRevisionId: string;
  focusChunkSlugs: string[];
  contexts: { slug: string; title: string }[];
}
export interface IeltsTopicContent { schemaVersion: 1; title: string; description: string; packs: IeltsTopicPack[] }

const slugPattern = /^ielts-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function object(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${path}: unsupported manifest fields`);
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string, min = 1, max = 2000): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new Error(`${path}: invalid text`);
  return value;
}
function slug(value: unknown, path: string): string {
  const parsed = text(value, path, 7, 160);
  if (!slugPattern.test(parsed)) throw new Error(`${path}: IELTS slugs must use the ielts- namespace`);
  return parsed;
}
function array(value: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(`${path}: expected ${min}–${max} entries`);
  return value;
}
function unique(values: string[], path: string) { if (new Set(values).size !== values.length) throw new Error(`${path}: duplicates are not allowed`); }

export function parseIeltsTopicManifest(input: unknown): IeltsTopicContent {
  const root = object(input, ['schemaVersion', 'title', 'description', 'packs'], 'topic');
  if (root.schemaVersion !== 1) throw new Error('schemaVersion: expected 1');
  const packs = array(root.packs, 'packs', 1, 16).map((value, index): IeltsTopicPack => {
    const path = `packs.${index}`;
    const pack = object(value, ['slug', 'difficulty', 'curriculumRevisionId', 'focusChunkSlugs', 'contexts'], path);
    if (!['foundation', 'developing', 'competent', 'advanced'].includes(String(pack.difficulty))) throw new Error(`${path}.difficulty: unsupported difficulty`);
    const curriculumRevisionId = text(pack.curriculumRevisionId, `${path}.curriculumRevisionId`);
    if (!uuidPattern.test(curriculumRevisionId)) throw new Error(`${path}.curriculumRevisionId: expected UUID`);
    const focusChunkSlugs = array(pack.focusChunkSlugs, `${path}.focusChunkSlugs`, 12, 100).map((value, i) => slug(value, `${path}.focusChunkSlugs.${i}`));
    unique(focusChunkSlugs, `${path}.focusChunkSlugs`);
    const contexts = array(pack.contexts, `${path}.contexts`, 2, 20).map((value, i) => {
      const context = object(value, ['slug', 'title'], `${path}.contexts.${i}`);
      return { slug: slug(context.slug, `${path}.contexts.${i}.slug`), title: text(context.title, `${path}.contexts.${i}.title`, 3, 160) };
    });
    unique(contexts.map(context => context.slug), `${path}.contexts`);
    return { slug: slug(pack.slug, `${path}.slug`), difficulty: pack.difficulty as IeltsTopicDifficulty, curriculumRevisionId, focusChunkSlugs, contexts };
  });
  unique(packs.map(pack => pack.slug), 'packs');
  return { schemaVersion: 1, title: text(root.title, 'title', 3, 160), description: text(root.description, 'description', 10, 2000), packs };
}
