import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import { INITIAL_IELTS_ACADEMIC_MOCK, INITIAL_IELTS_BAND_CURRICULUM, INITIAL_IELTS_INTEGRATED_PROFILES } from '@worklingo/contracts';

import { IELTS_BRIDGE_SEEDS } from '../../../ielts-bridge/infrastructure/seed-ielts-bridge.js';
import { IELTS_ORIENTATION_SEED } from '../../../ielts-orientation/infrastructure/seed-ielts-orientation.js';

function publication<T>(content: T) {
  return {
    id: randomUUID(), status: 'PUBLISHED', currentPublishedVersionId: randomUUID(),
    currentPublishedVersion: {
      id: '', status: 'PUBLISHED', archivedAt: null as Date | null, content: structuredClone(content),
    },
  };
}

export function ieltsBetaFixture() {
  const orientation = publication(IELTS_ORIENTATION_SEED);
  const orientationVersion = Object.assign(orientation.currentPublishedVersion, {
    id: orientation.currentPublishedVersionId, orientationId: orientation.id,
  });
  const bridge = IELTS_BRIDGE_SEEDS.map((content) => {
    const row = publication(content);
    return { ...row, currentPublishedVersion: { ...row.currentPublishedVersion,
      id: row.currentPublishedVersionId, moduleId: row.id, skill: content.skill.toUpperCase(),
      questionType: content.questionType, required: content.required,
    } };
  });
  const profiles = INITIAL_IELTS_INTEGRATED_PROFILES.map((content) => {
    const row = publication(content);
    return { ...row, durationMinutes: content.durationMinutes, currentPublishedVersion: {
      ...row.currentPublishedVersion, id: row.currentPublishedVersionId, profileId: row.id,
      durationMinutes: content.durationMinutes,
    } };
  });
  const curriculum = publication(INITIAL_IELTS_BAND_CURRICULUM);
  const curriculumVersion = Object.assign(curriculum.currentPublishedVersion, {
    id: curriculum.currentPublishedVersionId, curriculumId: curriculum.id,
  });
  const mock = publication(INITIAL_IELTS_ACADEMIC_MOCK);
  const audio = mock.currentPublishedVersion.content.listening.parts.map((part) => {
    const id = randomUUID();
    part.audioAssetId = id;
    return { id, status: 'READY', adapterName: 'local-windows-speech', byteSize: 4096,
      mimeType: 'audio/wav', checksum: 'a'.repeat(64), storageKey: `ielts/${id}.wav` };
  });
  const mockVersion = Object.assign(mock.currentPublishedVersion, {
    id: mock.currentPublishedVersionId, mockTestId: mock.id,
  });
  const program = { availabilityStatus: 'BETA', slug: 'ielts', name: 'IELTS',
    description: 'Local IELTS practice.', iconKey: 'ielts', learningGoal: 'Prepare across four skills.',
    proficiencyLabel: 'IELTS-oriented', paths: [] };
  const database = {
    learningProgram: { findMany: vi.fn(async () => [program]) },
    ieltsOrientation: { findUnique: vi.fn(async () => ({ ...orientation, currentPublishedVersion: orientationVersion, mediaAssets: [] })) },
    ieltsBridgeModule: { findMany: vi.fn(async () => bridge) },
    ieltsIntegratedProfile: { findMany: vi.fn(async () => profiles) },
    ieltsBandCurriculum: { findUnique: vi.fn(async () => ({ ...curriculum, currentPublishedVersion: curriculumVersion })) },
    ieltsMockTest: { findMany: vi.fn(async () => [{ ...mock, currentPublishedVersion: mockVersion }]) },
    audioArtifact: { findMany: vi.fn(async () => audio) },
    orientationMediaAsset: { findMany: vi.fn(async (): Promise<{ id: string }[]> => []) },
  };
  return { database, orientation, bridge, profiles, curriculum, mock, audio, program };
}
