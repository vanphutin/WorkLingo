import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { analyzeLessonSource, audioScriptFingerprintText, parseLessonSource, type NormalizedLessonDraft } from '@worklingo/content-format';
import { programImportHash } from './beginner-program-permission.js';
import { loadBeginnerVocabularyEvidence, type BeginnerVocabularyEvidence } from './beginner-vocabulary-evidence.js';

const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
interface AudioSelection { lesson: string; slug: string; filePath: string; fileSha256: string; scriptSha256: string; requestSha256: string }
interface SourceBundle { lesson: string; sourcePath: string; sourceSha256: string; reviewedBundleSha256: string }
interface Correction { code: string; sourceSha256: string; reviewedBundleSha256: string; previousSourceSha256: string; previousBundleSha256: string; responseTasks: unknown[]; rubrics: { slug: string; textSha256: string }[] }
export interface BeginnerVocabularyMapping { pilotId: string; expression: string; sourcePath: string; sourceSha256: string; lexicalEntryId: string | null; senseIds: string[]; relationship: string; rationale: string; masterCefr: string[] }
export interface BeginnerProgramSourceLesson {
  code: string; sourcePath: string; rawSource: string; sourceHash: string; checkoutHash: string; bundleHash: string;
  draft: NormalizedLessonDraft; audio: (AudioSelection & { bytes: Buffer; scriptHash: string })[]; vocabulary: BeginnerVocabularyMapping[];
}
export interface BeginnerProgramSource { inventoryHash: string; vocabularyEvidence: BeginnerVocabularyEvidence; counts: { lessons: number; activities: number; objectives: number; lexicalBlocks: number; scripts: number }; lessons: BeginnerProgramSourceLesson[] }
export function beginnerSourceInventoryHash(lessons: BeginnerProgramSourceLesson[], vocabularyEvidence: BeginnerVocabularyEvidence): string {
  for (const row of lessons) {
    if (sha(row.rawSource) !== row.sourceHash || row.audio.some(audio => sha(audio.bytes) !== audio.fileSha256)) throw new Error('BEGINNER_SOURCE_CHANGED');
  }
  return programImportHash({ vocabularyEvidence, lessons: lessons.map(row => ({ code: row.code, sourceHash: row.sourceHash, bundleHash: row.bundleHash, audio: row.audio.map(({ slug, scriptHash, fileSha256 }) => ({ slug, scriptHash, fileSha256 })), vocabulary: row.vocabulary })) });
}
/** Canonical Git text identity is LF; binary WAV identities are never normalized. */
export async function reconcileBeginnerSources(root: string, readText = (file: string) => readFileSync(file, 'utf8')): Promise<BeginnerProgramSource> {
  const json = <T>(file: string): T => JSON.parse(readText(path.join(root, file))) as T;
  const corrections = json<{ lessons: Correction[]; audioReuse: AudioSelection[]; rubricCode: { path: string; sha256: string } }>('docs/qualification/beginner-pilot-ai-correction-bindings.json');
  const bundles = json<{ sourceBundles: SourceBundle[] }>('docs/qualification/beginner-pilot-post-context-requalification.json').sourceBundles;
  const vocabularyEvidence = loadBeginnerVocabularyEvidence(root);
  const mappings = vocabularyEvidence.snapshot.mapping;
  if (bundles.length !== 8 || new Set(bundles.map(bundle => bundle.lesson)).size !== 8 || corrections.lessons.length !== 7 || corrections.audioReuse.length !== 24) throw new Error('BEGINNER_INVENTORY_INVALID');
  if (sha(readText(path.join(root, corrections.rubricCode.path)).replace(/\r\n/gu, '\n')) !== corrections.rubricCode.sha256) throw new Error('BEGINNER_RUBRIC_CHANGED');
  const lessons = bundles.map(bundle => {
    const checkout = readText(path.join(root, bundle.sourcePath));
    const rawSource = checkout.replace(/\r\n/gu, '\n'), sourceHash = sha(rawSource);
    if (sourceHash !== bundle.sourceSha256) throw new Error('BEGINNER_SOURCE_CHANGED');
    const analysis = analyzeLessonSource(rawSource), doc = parseLessonSource(rawSource).document;
    if (!analysis.canPublish || !analysis.normalizedDraft || doc.activities.length !== 8 || doc.objectives?.length !== 4 || doc.audioScripts.length !== 3) throw new Error('BEGINNER_SOURCE_INVALID');
    const correction = corrections.lessons.find(row => row.code === bundle.lesson);
    if (correction) {
      const { reviewedBundleSha256, previousSourceSha256: _source, previousBundleSha256: _bundle, ...projection } = correction;
      if (programImportHash(projection) !== reviewedBundleSha256 || reviewedBundleSha256 !== bundle.reviewedBundleSha256 || correction.sourceSha256 !== sourceHash || programImportHash(correction.responseTasks) !== programImportHash(doc.activities.filter(activity => ['speaking','writing'].includes(activity.activityType ?? '')))) throw new Error('BEGINNER_BUNDLE_CHANGED');
      for (const rubric of correction.rubrics) if (sha(doc.activities.find(activity => activity.slug === rubric.slug)?.rubric ?? '') !== rubric.textSha256) throw new Error('BEGINNER_RUBRIC_CHANGED');
    } else if (bundle.lesson !== 'MG02-L2' || bundle.reviewedBundleSha256 !== '06db374a3a4289630fd11ef8bc9cb170ed285525b94c2965d6d91b2f031cf193') throw new Error('BEGINNER_CONTROL_CHANGED');
    const audio = corrections.audioReuse.filter(row => row.lesson === bundle.lesson).map(row => {
      const script = doc.audioScripts.find(item => item.slug === row.slug);
      if (!script || sha(script.script) !== row.scriptSha256 || !doc.activities.some(activity => activity.activityType === 'listening' && activity.audioRef === row.slug)) throw new Error('BEGINNER_AUDIO_SCRIPT_CHANGED');
      const bytes = readFileSync(row.filePath);
      if (sha(bytes) !== row.fileSha256 || bytes.subarray(0, 4).toString() !== 'RIFF' || bytes.subarray(8, 12).toString() !== 'WAVE') throw new Error('BEGINNER_AUDIO_BYTES_CHANGED');
      return { ...row, bytes, scriptHash: sha(audioScriptFingerprintText(script)) };
    });
    if (audio.length !== 3) throw new Error('BEGINNER_AUDIO_MISSING');
    const vocabulary = mappings.filter(row => row.sourcePath === bundle.sourcePath);
    if (vocabulary.some(row => row.sourceSha256 !== sourceHash)) throw new Error('BEGINNER_VOCABULARY_STALE');
    return { code: bundle.lesson, sourcePath: bundle.sourcePath, rawSource, sourceHash, checkoutHash: sha(checkout), bundleHash: bundle.reviewedBundleSha256, draft: analysis.normalizedDraft, audio, vocabulary };
  });
  const counts = { lessons: lessons.length, activities: lessons.reduce((n, row) => n + row.draft.activities.length, 0), objectives: lessons.reduce((n, row) => n + (row.draft.foundation?.objectives.length ?? 0), 0), lexicalBlocks: lessons.reduce((n, row) => n + row.draft.wordBanks.flatMap(bank => bank.languageBlocks).length, 0), scripts: lessons.reduce((n, row) => n + row.audio.length, 0) };
  if (JSON.stringify(counts) !== JSON.stringify({ lessons: 8, activities: 64, objectives: 32, lexicalBlocks: 41, scripts: 24 }) || mappings.length !== 41) throw new Error('BEGINNER_INVENTORY_INVALID');
  const inventoryHash = beginnerSourceInventoryHash(lessons, vocabularyEvidence);
  return { inventoryHash, counts, lessons, vocabularyEvidence };
}
