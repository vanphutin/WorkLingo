import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeLessonSource, parseIeltsTopicManifest, parseLessonSource } from '@worklingo/content-format';
import { lessonSnapshotSchema, type PublishedMission } from '../../curriculum/domain/curriculum.types.js';

export const ieltsContentRoot = path.resolve(__dirname, '../../../../../content/ielts');
export function contentUuid(identity: string) { const h = createHash('sha256').update(`ielts-flow-v3:${identity}`).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; }

export async function readAuthoredIeltsTopics() {
  const catalog = JSON.parse(await readFile(path.join(ieltsContentRoot, 'topics/catalog.json'), 'utf8')) as { topics: string[] };
  if (catalog.topics.length !== 12 || new Set(catalog.topics).size !== 12 || catalog.topics.some(slug => !/^ielts-[a-z-]+$/u.test(slug))) throw new Error('Expected the twelve approved IELTS topics.');
  return Promise.all(catalog.topics.map(async slug => {
    const directory = path.join(ieltsContentRoot, 'topics', slug);
    const source = await readFile(path.join(directory, 'lesson.txt'), 'utf8');
    const analysis = analyzeLessonSource(source);
    if (!analysis.canPublish || !analysis.normalizedDraft) throw new Error(`${slug}: ${JSON.stringify(analysis.issues)}`);
    const draft = analysis.normalizedDraft;
    const manifest = parseIeltsTopicManifest(JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')));
    const lesson = lessonSnapshotSchema.parse({ ...draft,
      contentBlocks: draft.contentBlocks.map(block => ({ ...block, id: contentUuid(block.slug) })),
      wordBanks: draft.wordBanks.map(bank => ({ ...bank, id: contentUuid(bank.slug), languageBlocks: bank.languageBlocks.map(chunk => ({ ...chunk, id: contentUuid(chunk.slug) })) })),
      activities: draft.activities.map(activity => ({ ...activity, id: contentUuid(activity.slug) })),
    });
    const ast = parseLessonSource(source).document;
    const evidenceSources = Object.fromEntries([...ast.contents.map(block => [block.slug, block.text]), ...ast.audioScripts.map(script => [script.slug, script.script])]);
    const mission: PublishedMission = { id: contentUuid(`${slug}:mission`), slug, title: manifest.title, objective: draft.objective, purpose: 'learning', levelCode: 'IELTS_FOUNDATION', lessonVersion: { ...lesson, id: contentUuid(`${slug}:lesson-v1`), version: 1 } };
    return { slug, source, draft, ast, manifest, publishedLesson: { mission, programSlug: 'ielts', evidenceSources } };
  }));
}
