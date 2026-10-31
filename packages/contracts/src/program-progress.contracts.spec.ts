import { describe, expect, it } from 'vitest';
import { programProgressSchema, completeProgramReviewSchema } from './program-progress.contracts.ts';
describe('strict program progress commands', () => {
    it('rejects client mastery and unknown review fields', () => {
        expect(completeProgramReviewSchema.safeParse({ learningSessionId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), score: 1 }).success).toBe(false);
        expect(programProgressSchema.safeParse({ completionPercentage: 100, mastery: { score: 1 } }).success).toBe(false);
    });
});
