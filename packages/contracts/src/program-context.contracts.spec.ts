import { describe, expect, it } from 'vitest';

import { activateProgramSchema, programContextSchema } from './program-context.contracts.ts';

const program = { id: '10000000-0000-4000-8000-000000000002', slug: 'intermediate', name: 'Intermediate' };
const enrollment = {
  id: '20000000-0000-4000-8000-000000000001', revision: 1,
  currentLevel: { id: '20000000-0000-4000-8000-000000000002', code: 'FOUNDATION_1', name: 'Foundation' },
};

describe('Learner program context contracts', () => {
  it('represents an unassigned learner with a coherent null context', () => {
    expect(programContextSchema.parse({ activeProgram: null, enrollment: null })).toEqual({
      activeProgram: null, enrollment: null,
    });
  });

  it('rejects a half-populated context instead of treating it as assigned', () => {
    expect(programContextSchema.safeParse({ activeProgram: program, enrollment: null }).success).toBe(false);
    expect(programContextSchema.safeParse({ activeProgram: null, enrollment }).success).toBe(false);
  });

  it('validates a populated context and rejects malformed identities and revisions', () => {
    expect(programContextSchema.parse({ activeProgram: program, enrollment })).toEqual({ activeProgram: program, enrollment });
    expect(programContextSchema.safeParse({ activeProgram: { ...program, id: 'invalid' }, enrollment }).success).toBe(false);
    expect(programContextSchema.safeParse({ activeProgram: program, enrollment: { ...enrollment, revision: 0 } }).success).toBe(false);
    expect(programContextSchema.safeParse({ activeProgram: program, enrollment, learnerId: 'injected' }).success).toBe(false);
  });

  it('requires an explicit nullable expected revision and normalized non-empty program slug', () => {
    expect(activateProgramSchema.parse({ programSlug: ' intermediate ', expectedRevision: 1 })).toEqual({ programSlug: 'intermediate', expectedRevision: 1 });
    expect(activateProgramSchema.parse({ programSlug: 'intermediate', expectedRevision: null }).expectedRevision).toBeNull();
    for (const input of [
      { programSlug: 'intermediate' },
      { programSlug: ' ', expectedRevision: null },
      { programSlug: 'a'.repeat(101), expectedRevision: 1 },
      { programSlug: 'intermediate', expectedRevision: 0 },
      { programSlug: 'intermediate', expectedRevision: 1.2 },
      { programSlug: 'intermediate', expectedRevision: 1, learnerId: 'injected' },
    ]) expect(activateProgramSchema.safeParse(input).success).toBe(false);
  });
});
