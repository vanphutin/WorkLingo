import { describe, expect, it } from 'vitest';
import {
  assertMutableIdentity,
  assertPlayableMissionLessons,
  CurriculumMutationPolicyError,
  findArchiveBlockers,
} from './curriculum-mutation-policy.js';

describe('CurriculumMutationPolicy', () => {
  describe('assertMutableIdentity', () => {
    it('allows changing name on draft, published, or validated paths when identity is unchanged', () => {
      expect(() =>
        assertMutableIdentity({
          current: { slug: 'foundation-1', status: 'PUBLISHED' },
          proposed: { slug: 'foundation-1' },
          resourceType: 'PATH',
        }),
      ).not.toThrow();

      expect(() =>
        assertMutableIdentity({
          current: { slug: 'foundation-1', status: 'DRAFT' },
          proposed: { slug: 'foundation-renamed' },
          resourceType: 'PATH',
        }),
      ).not.toThrow();
    });

    it('rejects editing any field on archived curriculum', () => {
      expect(() =>
        assertMutableIdentity({
          current: { slug: 'archived-path', status: 'ARCHIVED' },
          proposed: {},
          resourceType: 'PATH',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertMutableIdentity({
          current: { slug: 'archived-path', status: 'ARCHIVED' },
          proposed: {},
          resourceType: 'PATH',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('ARCHIVED_CURRICULUM_IMMUTABLE');
      }
    });

    it('rejects mutating slug after publication or historical session reference', () => {
      expect(() =>
        assertMutableIdentity({
          current: { isPublished: true, slug: 'workplace-intro', status: 'PUBLISHED' },
          proposed: { slug: 'workplace-changed' },
          resourceType: 'PATH',
        }),
      ).toThrowError(/immutable/i);

      expect(() =>
        assertMutableIdentity({
          current: { hasSessionHistory: true, slug: 'workplace-intro', status: 'DRAFT' },
          proposed: { slug: 'workplace-changed' },
          resourceType: 'PATH',
        }),
      ).toThrowError(/immutable/i);
    });

    it('rejects mutating level code after publication or historical reference', () => {
      expect(() =>
        assertMutableIdentity({
          current: { code: 'A1_FOUNDATION', isPublished: true, status: 'PUBLISHED' },
          proposed: { code: 'A2_FOUNDATION' },
          resourceType: 'LEVEL',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertMutableIdentity({
          current: { code: 'A1_FOUNDATION', isPublished: true, status: 'PUBLISHED' },
          proposed: { code: 'A2_FOUNDATION' },
          resourceType: 'LEVEL',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('CODE_IMMUTABLE');
      }
    });

    it('always rejects converting purpose between LEARNING and PLACEMENT', () => {
      expect(() =>
        assertMutableIdentity({
          current: { purpose: 'LEARNING', status: 'DRAFT' },
          proposed: { purpose: 'PLACEMENT' },
          resourceType: 'MISSION',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      expect(() =>
        assertMutableIdentity({
          current: { purpose: 'PLACEMENT', status: 'DRAFT' },
          proposed: { purpose: 'LEARNING' },
          resourceType: 'MISSION',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertMutableIdentity({
          current: { purpose: 'LEARNING', status: 'DRAFT' },
          proposed: { purpose: 'PLACEMENT' },
          resourceType: 'MISSION',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('PURPOSE_IMMUTABLE');
      }
    });

    it('rejects changing parent relationship after publication', () => {
      expect(() =>
        assertMutableIdentity({
          current: {
            parentId: '11111111-1111-4111-8111-111111111111',
            status: 'PUBLISHED',
          },
          proposed: { parentId: '22222222-2222-4222-8222-222222222222' },
          resourceType: 'LEVEL',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertMutableIdentity({
          current: {
            parentId: '11111111-1111-4111-8111-111111111111',
            status: 'PUBLISHED',
          },
          proposed: { parentId: '22222222-2222-4222-8222-222222222222' },
          resourceType: 'LEVEL',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('PARENT_IMMUTABLE');
      }
    });
  });

  describe('findArchiveBlockers', () => {
    it('returns ALREADY_ARCHIVED if resource is already archived', () => {
      const blockers = findArchiveBlockers({
        resourceType: 'PATH',
        status: 'ARCHIVED',
      });
      expect(blockers).toEqual([
        expect.objectContaining({ code: 'ALREADY_ARCHIVED' }),
      ]);
    });

    it('blocks path archive when published levels exist', () => {
      const blockers = findArchiveBlockers({
        publishedChildCount: 2,
        resourceType: 'PATH',
        status: 'PUBLISHED',
      });
      expect(blockers).toEqual([
        expect.objectContaining({ code: 'HAS_PUBLISHED_LEVELS' }),
      ]);
    });

    it('blocks level archive when published missions exist', () => {
      const blockers = findArchiveBlockers({
        publishedChildCount: 1,
        resourceType: 'LEVEL',
        status: 'PUBLISHED',
      });
      expect(blockers).toEqual([
        expect.objectContaining({ code: 'HAS_PUBLISHED_MISSIONS' }),
      ]);
    });

    it('blocks mission or level archive when active learning sessions exist or it is a playable dependency', () => {
      const levelBlockers = findArchiveBlockers({
        hasActiveSessions: true,
        isPlayableDependency: true,
        publishedChildCount: 0,
        resourceType: 'LEVEL',
        status: 'PUBLISHED',
      });
      expect(levelBlockers.map((b) => b.code)).toContain('PLAYABLE_LEVEL_DEPENDENCY');
      expect(levelBlockers.map((b) => b.code)).toContain('ACTIVE_SESSIONS_EXIST');

      const missionBlockers = findArchiveBlockers({
        hasActiveSessions: true,
        isPlayableDependency: true,
        resourceType: 'MISSION',
        status: 'PUBLISHED',
      });
      expect(missionBlockers.map((b) => b.code)).toContain('PLAYABLE_LEVEL_DEPENDENCY');
      expect(missionBlockers.map((b) => b.code)).toContain('ACTIVE_SESSIONS_EXIST');
    });

    it('returns empty blockers when safe to archive draft without dependencies', () => {
      const blockers = findArchiveBlockers({
        hasActiveSessions: false,
        isPlayableDependency: false,
        publishedChildCount: 0,
        resourceType: 'MISSION',
        status: 'DRAFT',
      });
      expect(blockers).toHaveLength(0);
    });
  });

  describe('assertPlayableMissionLessons', () => {
    const validFourSkillActivities = [
      { id: 'act-1', learningBlock: 'activate', skills: ['reading'] },
      { id: 'act-2', learningBlock: 'readDecode', skills: ['listening'] },
      { id: 'act-3', learningBlock: 'listenReason', skills: ['speaking'] },
      { id: 'act-4', learningBlock: 'respond', skills: ['writing'] },
    ];

    it('allows attaching valid published lessons with 60-minute four-skill coverage', () => {
      expect(() =>
        assertPlayableMissionLessons({
          lessons: [
            {
              currentPublishedVersion: { activities: validFourSkillActivities },
              id: 'lesson-1',
              status: 'PUBLISHED',
            },
          ],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        }),
      ).not.toThrow();
    });

    it('rejects empty lesson list on published learning mission', () => {
      expect(() =>
        assertPlayableMissionLessons({
          lessons: [],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertPlayableMissionLessons({
          lessons: [],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('CURRICULUM_NOT_PLAYABLE');
      }
    });

    it('rejects attaching unpublished or draft lessons to a published mission', () => {
      expect(() =>
        assertPlayableMissionLessons({
          lessons: [
            {
              currentPublishedVersion: null,
              id: 'lesson-draft',
              status: 'DRAFT',
            },
          ],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertPlayableMissionLessons({
          lessons: [
            {
              currentPublishedVersion: null,
              id: 'lesson-draft',
              status: 'DRAFT',
            },
          ],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('INVALID_CURRICULUM_RELATIONSHIP');
      }
    });

    it('rejects lessons that lack four skills or cannot form a 60-minute session for published learning mission', () => {
      const incompleteActivities = [
        { id: 'act-1', learningBlock: 'WARMUP', skills: ['reading'] },
        { id: 'act-2', learningBlock: 'PRACTICE', skills: ['listening'] },
      ];

      expect(() =>
        assertPlayableMissionLessons({
          lessons: [
            {
              currentPublishedVersion: { activities: incompleteActivities },
              id: 'lesson-incomplete',
              status: 'PUBLISHED',
            },
          ],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        }),
      ).toThrowError(CurriculumMutationPolicyError);

      try {
        assertPlayableMissionLessons({
          lessons: [
            {
              currentPublishedVersion: { activities: incompleteActivities },
              id: 'lesson-incomplete',
              status: 'PUBLISHED',
            },
          ],
          missionPurpose: 'LEARNING',
          missionStatus: 'PUBLISHED',
        });
      } catch (error) {
        expect((error as CurriculumMutationPolicyError).code).toBe('CURRICULUM_NOT_PLAYABLE');
      }
    });
  });
});
