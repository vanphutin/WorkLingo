import type { Prisma } from '@prisma/client';
import {
  ieltsBandCurriculumContentSchema,
  ieltsBridgeModuleContentSchema,
  ieltsIntegratedProfileContentSchema,
  ieltsMockContentSchema,
  learningSkillSchema,
  orientationContentSchema,
} from '@worklingo/contracts';

/** Accepts either PrismaClient/PrismaService or an existing transaction. No writes. */
export type IeltsReadinessDatabase = Pick<Prisma.TransactionClient,
  'ieltsOrientation' | 'ieltsBridgeModule' | 'ieltsIntegratedProfile' |
  'ieltsBandCurriculum' | 'ieltsMockTest' | 'audioArtifact' | 'orientationMediaAsset'>;

export interface IeltsProgramReadiness {
  ready: boolean;
  checks: {
    orientation: boolean;
    bridge: boolean;
    integratedPractice: boolean;
    bandCurriculum: boolean;
    academicMock: boolean;
  };
  missing: string[];
}

const published = { status: 'PUBLISHED', archivedAt: null } as const;
const currentPublication = { status: { not: 'ARCHIVED' }, currentPublishedVersion: { is: published } } as const;
const versionFields = { id: true, status: true, archivedAt: true, content: true } as const;
const durations = [60, 90, 120, 150];

type Publication = {
  id: string;
  status: string;
  currentPublishedVersionId: string | null;
  currentPublishedVersion: { id: string; status: string; archivedAt: Date | null } | null;
};

function isCurrent(row: Publication | null): boolean {
  return row !== null && row.status !== 'ARCHIVED' && row.currentPublishedVersion !== null &&
    row.currentPublishedVersionId === row.currentPublishedVersion.id &&
    row.currentPublishedVersion.status === 'PUBLISHED' && row.currentPublishedVersion.archivedAt === null;
}

/**
 * Checks current immutable content, never mutable drafts, histories or learner evidence.
 * Call inside a RepeatableRead transaction when a coherent catalog/release snapshot is needed.
 * Queries one canonical Orientation/curriculum and four profiles. Candidates are
 * paged in batches of 64 Bridge modules / 16 mocks, with at most 64 referenced
 * audio metadata records per mock page. Stops once a usable candidate is found.
 */
export async function readIeltsProgramReadiness(db: IeltsReadinessDatabase): Promise<IeltsProgramReadiness> {
  const readModules = (cursor?: string) => db.ieltsBridgeModule.findMany({
    where: currentPublication, take: 64, orderBy: { id: 'asc' },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, status: true, currentPublishedVersionId: true,
      currentPublishedVersion: { select: { ...versionFields, moduleId: true, skill: true, questionType: true, required: true } },
    },
  });
  const readMocks = (cursor?: string) => db.ieltsMockTest.findMany({
    where: currentPublication, take: 16, orderBy: { id: 'asc' },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, status: true, currentPublishedVersionId: true,
      currentPublishedVersion: { select: { ...versionFields, mockTestId: true } },
    },
  });
  const [orientation, firstModules, profiles, curriculum, firstMocks] = await Promise.all([
    db.ieltsOrientation.findUnique({
      where: { slug: 'ielts-orientation', ...currentPublication },
      select: {
        id: true, status: true, currentPublishedVersionId: true,
        currentPublishedVersion: { select: { ...versionFields, orientationId: true } },
      },
    }),
    readModules(),
    db.ieltsIntegratedProfile.findMany({
      where: { ...currentPublication, durationMinutes: { in: durations } },
      take: 4, orderBy: { durationMinutes: 'asc' },
      select: { id: true, status: true, durationMinutes: true, currentPublishedVersionId: true,
        currentPublishedVersion: { select: { ...versionFields, profileId: true, durationMinutes: true } },
      },
    }),
    db.ieltsBandCurriculum.findUnique({
      where: { slug: 'ielts-band-pathway', ...currentPublication },
      select: { id: true, status: true, currentPublishedVersionId: true,
        currentPublishedVersion: { select: { ...versionFields, curriculumId: true } },
      },
    }),
    readMocks(),
  ]);

  const orientationContent = orientationContentSchema.safeParse(orientation?.currentPublishedVersion?.content);
  const referencedMediaIds = orientationContent.success ? [...new Set(orientationContent.data.slides.flatMap((slide) =>
    [slide.audioAssetId, slide.imageAssetId].filter((id): id is string => id !== null)))] : [];
  const media = referencedMediaIds.length === 0 || !orientation ? [] : await db.orientationMediaAsset.findMany({
    where: { orientationId: orientation.id, id: { in: referencedMediaIds } },
    select: { id: true }, take: 40, orderBy: { id: 'asc' },
  });
  const mediaIds = new Set(media.map((asset) => asset.id));
  const orientationReady = isCurrent(orientation) &&
    orientation?.currentPublishedVersion?.orientationId === orientation?.id && orientationContent.success &&
    orientationContent.data.slides.every((slide) =>
      [slide.audioAssetId, slide.imageAssetId].every((id) => id === null || mediaIds.has(id)));

  const skills = new Set<string>();
  let modules = firstModules;
  while (true) {
    for (const row of modules) {
      const version = row.currentPublishedVersion;
      const content = ieltsBridgeModuleContentSchema.safeParse(version?.content);
      if (isCurrent(row) && version?.moduleId === row.id && content.success && version.required && content.data.required &&
          version.skill === content.data.skill.toUpperCase() && version.questionType === content.data.questionType) {
        skills.add(content.data.skill);
      }
    }
    if (learningSkillSchema.options.every((skill) => skills.has(skill)) || modules.length < 64) break;
    modules = await readModules(modules.at(-1)!.id);
  }

  const profileDurations = new Set<number>();
  for (const row of profiles) {
    const version = row.currentPublishedVersion;
    const content = ieltsIntegratedProfileContentSchema.safeParse(version?.content);
    if (isCurrent(row) && version?.profileId === row.id && content.success &&
        content.data.durationMinutes === row.durationMinutes && version.durationMinutes === row.durationMinutes) {
      profileDurations.add(row.durationMinutes);
    }
  }

  const bandReady = isCurrent(curriculum) && curriculum?.currentPublishedVersion?.curriculumId === curriculum?.id &&
    ieltsBandCurriculumContentSchema.safeParse(curriculum?.currentPublishedVersion?.content).success;

  let academicMock = false;
  let mocks = firstMocks;
  while (true) {
    const mockAudioSets: string[][] = [];
    for (const row of mocks) {
      const version = row.currentPublishedVersion;
      const content = ieltsMockContentSchema.safeParse(version?.content);
      if (!isCurrent(row) || version?.mockTestId !== row.id || !content.success || content.data.variant !== 'ACADEMIC') continue;
      const ids = content.data.listening.parts.flatMap((part) => part.audioAssetId ? [part.audioAssetId] : []);
      if (ids.length === 4 && new Set(ids).size === 4) mockAudioSets.push(ids);
    }
    const audioIds = [...new Set(mockAudioSets.flat())];
    const audio = audioIds.length === 0 ? [] : await db.audioArtifact.findMany({
      where: { id: { in: audioIds }, status: 'READY', adapterName: { not: 'fake-tts' } },
      select: { id: true, status: true, adapterName: true, byteSize: true, checksum: true, storageKey: true, mimeType: true },
      take: 64, orderBy: { id: 'asc' },
    });
    const readyAudio = new Set(audio.filter((asset) =>
      asset.status === 'READY' && asset.adapterName.trim() !== '' && asset.adapterName !== 'fake-tts' &&
      asset.byteSize > 0 && asset.checksum.trim() !== '' && asset.storageKey.trim() !== '' &&
      asset.mimeType.startsWith('audio/')).map((asset) => asset.id));
    academicMock = mockAudioSets.some((ids) => ids.every((id) => readyAudio.has(id)));
    if (academicMock || mocks.length < 16) break;
    mocks = await readMocks(mocks.at(-1)!.id);
  }

  const checks = {
    orientation: orientationReady,
    bridge: learningSkillSchema.options.every((skill) => skills.has(skill)),
    integratedPractice: durations.every((duration) => profileDurations.has(duration)),
    bandCurriculum: bandReady,
    academicMock,
  };
  return { ready: Object.values(checks).every(Boolean), checks,
    missing: Object.entries(checks).filter(([, ready]) => !ready).map(([phase]) => phase) };
}
