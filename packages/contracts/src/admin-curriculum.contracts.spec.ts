import { describe, expect, it } from 'vitest';
import {
  createLearningPathInputSchema,
  updateLearningPathInputSchema,
  createLevelInputSchema,
  updateLevelInputSchema,
  createMissionInputSchema,
  updateMissionInputSchema,
  reorderCurriculumInputSchema,
  replaceMissionLessonsInputSchema,
  adminCurriculumTreeSchema,
} from './admin-curriculum.contracts';

describe('Admin Curriculum Contracts', () => {
  it('validates CreateLearningPathInput requires UUID idempotency key and valid slug', () => {
    const valid = {
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'General Business English',
      programId: '10000000-0000-4000-8000-000000000004',
      slug: 'general-business-english',
    };
    expect(createLearningPathInputSchema.parse(valid)).toEqual(valid);

    expect(() =>
      createLearningPathInputSchema.parse({
        ...valid,
        idempotencyKey: 'not-a-uuid',
      }),
    ).toThrow();

    expect(() =>
      createLearningPathInputSchema.parse({
        ...valid,
        slug: 'INVALID SLUG!',
      }),
    ).toThrow();

    expect(() =>
      createLearningPathInputSchema.parse({
        ...valid,
        programId: 'not-a-uuid',
      }),
    ).toThrow();
  });

  it('validates UpdateLearningPathInput requires positive expectedRevision', () => {
    const valid = {
      expectedRevision: 1,
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'Updated Name',
    };
    expect(updateLearningPathInputSchema.parse(valid)).toEqual(valid);

    expect(() =>
      updateLearningPathInputSchema.parse({
        ...valid,
        expectedRevision: 0,
      }),
    ).toThrow();

    expect(() =>
      updateLearningPathInputSchema.parse({
        ...valid,
        expectedRevision: -1,
      }),
    ).toThrow();
  });

  it('validates CreateLevelInput', () => {
    const valid = {
      cefrReference: 'A1',
      code: 'FOUNDATION_1',
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'Foundation Level 1',
      order: 1,
      pathId: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
    };
    expect(createLevelInputSchema.parse(valid)).toEqual(valid);

    expect(() =>
      createLevelInputSchema.parse({
        ...valid,
        pathId: 'not-a-uuid',
      }),
    ).toThrow();
  });

  it('validates UpdateLevelInput revision and non-empty optional fields', () => {
    const valid = {
      expectedRevision: 2,
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'Foundation Level 1 Updated',
    };
    expect(updateLevelInputSchema.parse(valid)).toEqual(valid);
    expect(() =>
      updateLevelInputSchema.parse({ ...valid, expectedRevision: 0 }),
    ).toThrow();
    expect(() =>
      updateLevelInputSchema.parse({ ...valid, name: '   ' }),
    ).toThrow();
  });

  it('validates CreateMissionInput with purpose defaulting to LEARNING', () => {
    const valid = {
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      levelId: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
      objective: 'Practice workplace introductions',
      slug: 'workplace-introductions',
      title: 'Workplace Introductions',
    };
    const parsed = createMissionInputSchema.parse(valid);
    expect(parsed.purpose).toBe('LEARNING');

    const placement = createMissionInputSchema.parse({
      ...valid,
      purpose: 'PLACEMENT',
    });
    expect(placement.purpose).toBe('PLACEMENT');
  });

  it('validates UpdateMissionInput revision and non-empty optional fields', () => {
    const valid = {
      expectedRevision: 3,
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      objective: 'Practice a concise workplace status update',
    };
    expect(updateMissionInputSchema.parse(valid)).toEqual(valid);
    expect(() =>
      updateMissionInputSchema.parse({ ...valid, expectedRevision: -1 }),
    ).toThrow();
    expect(() =>
      updateMissionInputSchema.parse({ ...valid, objective: '' }),
    ).toThrow();
  });

  it('validates ReorderCurriculumInput requires unique UUID array with at least one item', () => {
    const valid = {
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      orderedIds: [
        'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
        'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
      ],
    };
    expect(reorderCurriculumInputSchema.parse(valid)).toEqual(valid);

    // duplicate IDs in reorder are rejected
    expect(() =>
      reorderCurriculumInputSchema.parse({
        idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
        orderedIds: [
          'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
          'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
        ],
      }),
    ).toThrow();

    // empty array rejected
    expect(() =>
      reorderCurriculumInputSchema.parse({
        idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
        orderedIds: [],
      }),
    ).toThrow();
  });

  it('validates ReplaceMissionLessonsInput rejects duplicate lessonIds', () => {
    const valid = {
      expectedRevision: 2,
      idempotencyKey: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      lessonIds: [
        'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
        'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
      ],
    };
    expect(replaceMissionLessonsInputSchema.parse(valid)).toEqual(valid);

    expect(() =>
      replaceMissionLessonsInputSchema.parse({
        ...valid,
        lessonIds: [
          'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
          'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
        ],
      }),
    ).toThrow();
  });

  it('parses complete AdminCurriculumTreeDto structure', () => {
    const sampleTree = {
      paths: [
        {
          archiveBlockers: [],
          id: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
          levels: [
            {
              archiveBlockers: [],
              cefrReference: 'A1',
              code: 'FOUNDATION_1',
              id: 'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
              isPlayable: true,
              missions: [
                {
                  archiveBlockers: [],
                  id: 'd4e5f6a1-b2c3-4d4e-bf5a-6b7c8d9e0f1a',
                  isPlayable: true,
                  lessons: [
                    {
                      currentPublishedVersionId: 'e5f6a1b2-c3d4-4e5f-8c06-7c8d9e0f1a2b',
                      currentPublishedVersionNumber: 1,
                      hasAudio: true,
                      id: 'f6a1b2c3-d4e5-4f6a-8d17-8d9e0f1a2b3c',
                      order: 1,
                      slug: 'lesson-welcome-team',
                      title: 'Welcome to the Team',
                    },
                  ],
                  levelId: 'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
                  objective: 'Introductions',
                  order: 1,
                  playabilityReasons: [],
                  purpose: 'LEARNING',
                  revision: 1,
                  slug: 'mission-welcome',
                  status: 'PUBLISHED',
                  title: 'Welcome Mission',
                },
              ],
              name: 'Foundation 1',
              order: 1,
              pathId: 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e',
              playabilityReasons: [],
              revision: 1,
              status: 'PUBLISHED',
            },
          ],
          name: 'Business English',
          program: {
            availabilityStatus: 'AVAILABLE',
            id: '10000000-0000-4000-8000-000000000002',
            name: 'Intermediate',
            slug: 'intermediate',
          },
          revision: 1,
          slug: 'business-english',
          status: 'PUBLISHED',
        },
      ],
      programs: [
        {
          availabilityStatus: 'AVAILABLE',
          id: '10000000-0000-4000-8000-000000000002',
          name: 'Intermediate',
          slug: 'intermediate',
        },
      ],
    };

    expect(adminCurriculumTreeSchema.parse(sampleTree)).toEqual(sampleTree);
  });
});
