import type { Prisma } from '@prisma/client';
import { ieltsBandCurriculumContentSchema, ieltsBridgeModuleContentSchema, ieltsIntegratedProfileContentSchema, ieltsMockContentSchema, orientationContentSchema } from '@worklingo/contracts';
import { buildMock, hash, stableUuid, validateOriginalMock } from './content.js';
import { curateBand, curateBridge, curateOrientation } from './curation.js';
import type { PreparedAudio } from './prepare-audio.js';

export const bridgeSlugs = ['listening-form-completion', 'reading-true-false-not-given', 'speaking-part-1', 'writing-task-analysis'];
export const storageRoot = 'D:/Projects/WorkLingo/apps/api/data';
export const mockSlug = 'academic-full-mock-1';
export const releaseName = 'ielts-local-beta-2026-10-15-v1';
export const audioIdentity = (entry: PreparedAudio) => `${releaseName}:part-${entry.part}:${entry.inputHash}:${entry.checksum}`;
export const audioId = (entry: PreparedAudio) => stableUuid(audioIdentity(entry));

/** All reads are bounded, contain authored content only, and exclude learner tables. */
export async function readReleaseState(db: Prisma.TransactionClient, audioIds: string[]) {
  const [program, orientation, bridges, profiles, band, mock, audio] = await Promise.all([
    db.learningProgram.findUniqueOrThrow({ where: { slug: 'ielts' } }),
    db.ieltsOrientation.findUniqueOrThrow({ where: { slug: 'ielts-orientation' }, include: { currentPublishedVersion: true } }),
    db.ieltsBridgeModule.findMany({ where: { slug: { in: bridgeSlugs } }, include: { currentPublishedVersion: true }, orderBy: { slug: 'asc' }, take: 4 }),
    db.ieltsIntegratedProfile.findMany({ where: { durationMinutes: { in: [60, 90, 120, 150] } }, include: { currentPublishedVersion: true }, orderBy: { durationMinutes: 'asc' }, take: 4 }),
    db.ieltsBandCurriculum.findUniqueOrThrow({ where: { slug: 'ielts-band-pathway' }, include: { currentPublishedVersion: true } }),
    db.ieltsMockTest.findUniqueOrThrow({ where: { slug: mockSlug }, include: { currentPublishedVersion: true } }),
    db.audioArtifact.findMany({ where: { id: { in: audioIds } }, orderBy: { id: 'asc' }, take: 4 }),
  ]);
  return { program, orientation, bridges, profiles, band, mock, audio };
}
export type ReleaseState = Awaited<ReturnType<typeof readReleaseState>>;
export function assertArchivePolicy(state: { orientation: { status: string }; band: { status: string }; mock: { status: string } }): void {
  if (state.band.status === 'ARCHIVED' || state.mock.status === 'ARCHIVED') throw new Error('Band/Mock was archived; explicit parent review is required before reopening.');
}
interface Parent { status: string; currentPublishedVersion: { status: string; archivedAt: Date | null; content: Prisma.JsonValue } | null }
export function isPublished(row: Parent): boolean { return row.status !== 'ARCHIVED' && row.currentPublishedVersion?.status === 'PUBLISHED' && row.currentPublishedVersion.archivedAt === null; }
function same(row: Parent, content: unknown, parse: (value: unknown) => unknown): boolean {
  return isPublished(row) && hash(parse(row.currentPublishedVersion!.content)) === hash(content);
}

export function makePlan(state: ReleaseState, manifest: PreparedAudio[]) {
  assertArchivePolicy(state);
  if (state.bridges.length !== 4 || state.profiles.length !== 4) throw new Error('Expected all four authored Bridge modules and published practice profiles.');
  for (const profile of state.profiles) {
    if (!isPublished(profile)) throw new Error('Practice profile is unavailable; parent must review it before release.');
    const content = ieltsIntegratedProfileContentSchema.parse(profile.currentPublishedVersion!.content);
    if (content.durationMinutes !== profile.durationMinutes) throw new Error('Practice profile duration mismatch.');
  }
  const orientation = curateOrientation(orientationContentSchema.parse(state.orientation.draftContent));
  const band = curateBand(ieltsBandCurriculumContentSchema.parse(state.band.draftContent));
  const bridges = state.bridges.map((row) => {
    if (row.status === 'ARCHIVED') throw new Error('A Bridge module was archived; explicit parent review required.');
    const content = curateBridge(ieltsBridgeModuleContentSchema.parse(row.currentPublishedVersion?.content ?? row.draftContent));
    return { id: row.id, revision: row.draftRevision, content, publish: !same(row, content, ieltsBridgeModuleContentSchema.parse) };
  });
  const mock = buildMock(manifest.map(audioId)); validateOriginalMock(mock);
  const work = { orientation: !same(state.orientation, orientation, orientationContentSchema.parse), bridges,
    band: !same(state.band, band, ieltsBandCurriculumContentSchema.parse), mock: !same(state.mock, mock, ieltsMockContentSchema.parse) };
  // Fingerprint covers drafts, revision/status/current pointers, media metadata, program metadata, and selected new content.
  const fingerprint = hash({ releaseName, state, orientation, band, bridges, mock, manifest });
  const complete = state.program.availabilityStatus === 'BETA' && !work.orientation && !work.band && !work.mock && !bridges.some((item) => item.publish);
  return { fingerprint, complete, orientation, band, bridges, mock, work };
}
