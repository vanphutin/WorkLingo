import { describe, expect, it, vi } from 'vitest';

import { ieltsBetaFixture } from './__fixtures__/ielts-beta.js';
import { readIeltsProgramReadiness, type IeltsReadinessDatabase } from './ielts-program-readiness.js';

type Fixture = ReturnType<typeof ieltsBetaFixture>;
const read = (fixture: Fixture) => readIeltsProgramReadiness(fixture.database as unknown as IeltsReadinessDatabase);
const parents = (fixture: Fixture) => [fixture.orientation, ...fixture.bridge, ...fixture.profiles, fixture.curriculum, fixture.mock];

describe('readIeltsProgramReadiness', () => {
  it('checks all five published phases independently of stored program availability', async () => {
    const fixture = ieltsBetaFixture();
    fixture.program.availabilityStatus = 'IN_DEVELOPMENT';
    await expect(read(fixture)).resolves.toEqual({ ready: true, missing: [], checks: {
      orientation: true, bridge: true, integratedPractice: true, bandCurriculum: true, academicMock: true,
    } });
  });

  it.each(['DRAFT', 'VALIDATED'])('keeps a current publication usable when all parents are %s', async (status) => {
    const fixture = ieltsBetaFixture();
    parents(fixture).forEach((parent) => { parent.status = status; });
    expect((await read(fixture)).ready).toBe(true);
  });

  it.each(['orientation', 'bridge', 'integratedPractice', 'bandCurriculum', 'academicMock'] as const)(
    'reports missing %s without accepting a partial chain', async (phase) => {
      const fixture = ieltsBetaFixture();
      if (phase === 'orientation') fixture.database.ieltsOrientation.findUnique.mockResolvedValueOnce(null!);
      if (phase === 'bridge') fixture.bridge.pop();
      if (phase === 'integratedPractice') fixture.profiles.pop();
      if (phase === 'bandCurriculum') fixture.database.ieltsBandCurriculum.findUnique.mockResolvedValueOnce(null!);
      if (phase === 'academicMock') fixture.database.ieltsMockTest.findMany.mockResolvedValueOnce([]);
      await expect(read(fixture)).resolves.toMatchObject({ ready: false, checks: { [phase]: false }, missing: [phase] });
    },
  );

  it.each(['parent archived', 'version archived', 'archive timestamp', 'wrong pointer', 'missing pointer'])(
    'excludes every publication with %s', async (failure) => {
      const fixture = ieltsBetaFixture();
      for (const parent of parents(fixture)) {
        if (failure === 'parent archived') parent.status = 'ARCHIVED';
        if (failure === 'version archived') parent.currentPublishedVersion.status = 'ARCHIVED';
        if (failure === 'archive timestamp') parent.currentPublishedVersion.archivedAt = new Date();
        if (failure === 'wrong pointer') parent.currentPublishedVersionId = crypto.randomUUID();
        if (failure === 'missing pointer') Object.assign(parent, { currentPublishedVersionId: null });
      }
      expect((await read(fixture)).checks).toEqual({
        orientation: false, bridge: false, integratedPractice: false, bandCurriculum: false, academicMock: false,
      });
    },
  );

  it('rejects cross-parent version references including Orientation, whose FK does not enforce ownership', async () => {
    const fixture = ieltsBetaFixture();
    Object.assign(fixture.orientation.currentPublishedVersion, { orientationId: crypto.randomUUID() });
    fixture.bridge.forEach((row) => { row.currentPublishedVersion.moduleId = crypto.randomUUID(); });
    fixture.profiles.forEach((row) => { row.currentPublishedVersion.profileId = crypto.randomUUID(); });
    Object.assign(fixture.curriculum.currentPublishedVersion, { curriculumId: crypto.randomUUID() });
    Object.assign(fixture.mock.currentPublishedVersion, { mockTestId: crypto.randomUUID() });
    expect(Object.values((await read(fixture)).checks)).toEqual([false, false, false, false, false]);
  });

  it('validates actual immutable content instead of trusting published row counts', async () => {
    const fixture = ieltsBetaFixture();
    parents(fixture).forEach((parent) => { Object.assign(parent.currentPublishedVersion, { content: {} }); });
    expect(Object.values((await read(fixture)).checks)).toEqual([false, false, false, false, false]);
  });

  it('requires four different Bridge skills with matching indexed skill and question type', async () => {
    const fixture = ieltsBetaFixture();
    fixture.bridge[3] = structuredClone(fixture.bridge[0]!);
    expect((await read(fixture)).checks.bridge).toBe(false);
    const mismatched = ieltsBetaFixture();
    mismatched.bridge[3]!.currentPublishedVersion.skill = 'READING';
    expect((await read(mismatched)).checks.bridge).toBe(false);
  });

  it.each(['all optional', 'one optional', 'content mismatch'])('requires required Bridge coverage: %s', async (failure) => {
    const fixture = ieltsBetaFixture();
    for (const row of failure === 'all optional' ? fixture.bridge : fixture.bridge.slice(0, 1)) {
      row.currentPublishedVersion.required = false;
      if (failure !== 'content mismatch') row.currentPublishedVersion.content.required = false;
    }
    expect((await read(fixture)).checks.bridge).toBe(false);
  });

  it('requires valid allocations and matching parent/version/content duration for each of 60/90/120/150', async () => {
    const fixture = ieltsBetaFixture();
    Object.assign(fixture.profiles[3]!.currentPublishedVersion, { durationMinutes: 120 });
    expect((await read(fixture)).checks.integratedPractice).toBe(false);
    const invalid = ieltsBetaFixture();
    Object.assign(invalid.profiles[0]!.currentPublishedVersion.content.allocations[0]!, { targetMinutes: 1 });
    expect((await read(invalid)).checks.integratedPractice).toBe(false);
  });

  it('requires the validated seven-stage curriculum and its prerequisite sequence', async () => {
    const fixture = ieltsBetaFixture();
    Object.assign(fixture.curriculum.currentPublishedVersion.content, { stages: [] });
    expect((await read(fixture)).checks.bandCurriculum).toBe(false);
    const invalid = ieltsBetaFixture();
    Object.assign(invalid.curriculum.currentPublishedVersion.content.stages[2]!, { prerequisiteStageCodes: [] });
    expect((await read(invalid)).checks.bandCurriculum).toBe(false);
  });

  it('rejects Orientation media references that do not belong to its parent', async () => {
    const fixture = ieltsBetaFixture();
    fixture.orientation.currentPublishedVersion.content.slides[0]!.audioAssetId = crypto.randomUUID();
    expect((await read(fixture)).checks.orientation).toBe(false);
  });

  it('looks up referenced Orientation media without unrelated draft assets crowding out publication assets', async () => {
    const fixture = ieltsBetaFixture();
    const assetId = crypto.randomUUID();
    fixture.orientation.currentPublishedVersion.content.slides[0]!.audioAssetId = assetId;
    const findMany = vi.fn(async () => [{ id: assetId }]);
    Object.assign(fixture.database, { orientationMediaAsset: { findMany } });
    expect((await read(fixture)).checks.orientation).toBe(true);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { orientationId: fixture.orientation.id, id: { in: [assetId] } }, take: 40, select: { id: true },
    }));
  });

  it.each(['general training', 'missing reference', 'reused reference', 'incomplete mock'])(
    'requires an Academic mock with four distinct Listening artifacts: %s', async (failure) => {
      const fixture = ieltsBetaFixture();
      const content = fixture.mock.currentPublishedVersion.content;
      if (failure === 'general training') Object.assign(content, { variant: 'GENERAL_TRAINING' });
      if (failure === 'missing reference') content.listening.parts[0]!.audioAssetId = null;
      if (failure === 'reused reference') content.listening.parts[0]!.audioAssetId = content.listening.parts[1]!.audioAssetId;
      if (failure === 'incomplete mock') Object.assign(content.reading, { passages: [] });
      expect((await read(fixture)).checks.academicMock).toBe(false);
    },
  );

  it.each(['missing', 'not READY', 'fake', 'empty bytes', 'empty storage', 'empty checksum', 'wrong mime'])(
    'relocks the mock when one referenced artifact is %s', async (failure) => {
      const fixture = ieltsBetaFixture();
      const asset = fixture.audio[0]!;
      if (failure === 'missing') fixture.audio.shift();
      if (failure === 'not READY') asset.status = 'FAILED';
      if (failure === 'fake') asset.adapterName = 'fake-tts';
      if (failure === 'empty bytes') asset.byteSize = 0;
      if (failure === 'empty storage') asset.storageKey = '';
      if (failure === 'empty checksum') asset.checksum = '';
      if (failure === 'wrong mime') asset.mimeType = 'text/plain';
      expect((await read(fixture)).checks.academicMock).toBe(false);
    },
  );

  it('accepts any complete mock candidate without combining different incomplete mocks', async () => {
    const fixture = ieltsBetaFixture();
    const other = ieltsBetaFixture();
    fixture.database.ieltsMockTest.findMany.mockImplementation(async () => [fixture.mock, other.mock].map((mock) => ({
      ...mock, currentPublishedVersion: { ...mock.currentPublishedVersion, id: mock.currentPublishedVersionId, mockTestId: mock.id },
    })));
    fixture.database.audioArtifact.findMany.mockImplementation(async () => [...fixture.audio, ...other.audio]);
    fixture.audio.shift();
    expect((await read(fixture)).ready).toBe(true);
    other.audio.pop();
    expect((await read(fixture)).ready).toBe(false);
  });

  it('finds a complete Academic mock beyond the first 16 candidates using bounded pages', async () => {
    const fixture = ieltsBetaFixture();
    const template = (await fixture.database.ieltsMockTest.findMany())[0]!;
    const rows = Array.from({ length: 17 }, (_, index) => {
      const row = structuredClone(template);
      row.id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      row.currentPublishedVersion.mockTestId = row.id;
      if (index < 16) row.currentPublishedVersion.content.listening.parts.forEach((part) => { part.audioAssetId = crypto.randomUUID(); });
      return row;
    });
    const queries: PageQuery[] = [];
    fixture.database.ieltsMockTest.findMany.mockImplementation(paged(rows, queries));
    expect((await read(fixture)).checks.academicMock).toBe(true);
    expect(queries).toHaveLength(2);
    expect(queries[1]).toMatchObject({ take: 16, cursor: { id: rows[15]!.id }, skip: 1 });
    expect(fixture.database.audioArtifact.findMany).toHaveBeenCalledTimes(2);
  });

  it('finds the fourth required Bridge skill beyond the first 64 candidates using bounded pages', async () => {
    const fixture = ieltsBetaFixture();
    const rows = Array.from({ length: 65 }, (_, index) => {
      const row = structuredClone(fixture.bridge[index === 64 ? 3 : index % 3]!);
      row.id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
      row.currentPublishedVersion.moduleId = row.id;
      return row;
    });
    const queries: PageQuery[] = [];
    fixture.database.ieltsBridgeModule.findMany.mockImplementation(paged(rows, queries));
    expect((await read(fixture)).checks.bridge).toBe(true);
    expect(queries).toHaveLength(2);
    expect(queries[1]).toMatchObject({ take: 64, cursor: { id: rows[63]!.id }, skip: 1 });
  });

  it('bounds current-publication queries and reads only referenced audio metadata', async () => {
    const fixture = ieltsBetaFixture();
    await read(fixture);
    for (const [find, take] of [
      [fixture.database.ieltsBridgeModule.findMany, 64],
      [fixture.database.ieltsIntegratedProfile.findMany, 4],
      [fixture.database.ieltsMockTest.findMany, 16],
    ] as const) {
      expect(find).toHaveBeenCalledWith(expect.objectContaining({ take,
        where: expect.objectContaining({ status: { not: 'ARCHIVED' },
          currentPublishedVersion: { is: { status: 'PUBLISHED', archivedAt: null } },
        }),
      }));
      const args = JSON.stringify(find.mock.calls);
      expect(args).not.toContain('draftContent');
      expect(args).not.toContain('"versions"');
    }
    expect(fixture.database.audioArtifact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 64, where: { id: { in: fixture.audio.map((asset) => asset.id) }, status: 'READY', adapterName: { not: 'fake-tts' } },
      select: { id: true, status: true, adapterName: true, byteSize: true, checksum: true, storageKey: true, mimeType: true },
    }));
  });
});

type PageQuery = { take: number; cursor?: { id: string }; skip?: number };
function paged<T extends { id: string }>(rows: T[], queries: PageQuery[]) {
  return async (input?: unknown) => {
    const query = input as PageQuery;
    queries.push(query);
    const start = query.cursor ? rows.findIndex((row) => row.id === query.cursor!.id) + (query.skip ?? 0) : 0;
    return rows.slice(start, start + query.take);
  };
}
