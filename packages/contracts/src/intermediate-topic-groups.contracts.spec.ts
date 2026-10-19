import { describe, expect, it } from 'vitest';
import * as contracts from './index.ts';

const id = '11111111-1111-4111-8111-111111111111';
describe('Intermediate topic group contracts', () => {
  it('exports strict group and catalog schemas using actual import statuses', () => {
    expect(contracts.intermediateTopicGroupSchema).toBeDefined();
    const group = { id, name: 'Work', description: '', revision: 1, lessonCount: 2 };
    expect(contracts.intermediateTopicGroupSchema.parse(group)).toEqual(group);
    for (const status of ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']) {
      expect(contracts.intermediateTopicGroupCatalogSchema.safeParse({ groups: [group], lessons: [{ importId: id, title: 'Lesson', status, groupId: null, revision: 0 }] }).success).toBe(true);
    }
    expect(contracts.intermediateTopicGroupCatalogSchema.safeParse({ groups: [group], lessons: [{ importId: id, title: 'Lesson', status: 'FAILED', groupId: null, revision: 0 }] }).success).toBe(false);
    expect(contracts.intermediateTopicGroupSchema.safeParse({ ...group, revision: 0 }).success).toBe(false);
    expect(contracts.intermediateTopicGroupSchema.safeParse({ ...group, lessonCount: -1 }).success).toBe(false);
  });
  it('normalizes names and rejects unknown fields, malformed IDs and invalid revisions', () => {
    expect(contracts.createIntermediateTopicGroupSchema).toBeDefined();
    expect(contracts.createIntermediateTopicGroupSchema.parse({ name: '  Work  life ', description: ' Intro ' })).toEqual({ name: 'Work life', description: 'Intro' });
    for (const input of [{ name: '  ', description: '' }, { name: 'x'.repeat(121), description: '' }, { name: 'Work', description: 'x'.repeat(2001) }, { name: 'Work', description: '', revision: 99 }]) {
      expect(contracts.createIntermediateTopicGroupSchema.safeParse(input).success).toBe(false);
    }
    expect(contracts.updateIntermediateTopicGroupSchema.safeParse({ name: 'Work', description: '', expectedRevision: 0 }).success).toBe(false);
    expect(contracts.deleteIntermediateTopicGroupSchema.safeParse({ expectedRevision: 1, force: true }).success).toBe(false);
    expect(contracts.assignIntermediateTopicGroupSchema.parse({ groupId: null, expectedRevision: 0 })).toEqual({ groupId: null, expectedRevision: 0 });
    for (const input of [{ expectedRevision: 0 }, { groupId: 'bad', expectedRevision: 0 }, { groupId: id, expectedRevision: -1 }, { groupId: id, expectedRevision: 0.5 }]) {
      expect(contracts.assignIntermediateTopicGroupSchema.safeParse(input).success).toBe(false);
    }
  });
  it('allows only public group metadata on learner topics and leaves session requests unchanged', () => {
    const topic = { id, title: 'Topic', lessonVersionId: id, durationMinutes: 60, group: { id, name: 'Work', description: 'Work life' } };
    expect(contracts.learnerTopicSchema.safeParse(topic).success).toBe(true);
    expect(contracts.learnerTopicSchema.safeParse({ ...topic, group: { ...topic.group, approvedById: id } }).success).toBe(false);
    expect(contracts.createTopicSessionSchema.safeParse({ clientSessionId: id, groupId: id }).success).toBe(false);
  });
});
