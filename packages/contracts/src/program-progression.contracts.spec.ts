import {describe,it,expect} from 'vitest';
import {createProgramSchema,publishProgramSchema,enrollProgramSchema} from './program-progression.contracts.ts';
describe('R2 program command contracts',()=>{
 const metadata={name:'Work English',description:'Practice workplace English',learningGoal:'Communicate at work',proficiencyLabel:'Foundation',iconKey:'intermediate',displayOrder:10};
 it('rejects reserved programs and unknown privilege fields',()=>{expect(createProgramSchema.safeParse({...metadata,slug:'beginner',idempotencyKey:'request-1'}).success).toBe(false);expect(createProgramSchema.safeParse({...metadata,slug:'work-english',idempotencyKey:'request-1',availabilityStatus:'AVAILABLE'}).success).toBe(false);});
 it('requires unique ordered published pins and positive context revisions',()=>{const id='10000000-0000-4000-8000-000000000001';expect(publishProgramSchema.safeParse({curriculumRevisionIds:[id,id],expectedRevision:1,idempotencyKey:'publish-1'}).success).toBe(false);expect(enrollProgramSchema.safeParse({programSlug:'work-english',expectedRevision:null}).success).toBe(false);});
 it('accepts bounded draft metadata',()=>{expect(createProgramSchema.parse({...metadata,slug:'work-english',idempotencyKey:'request-1'}).slug).toBe('work-english');});
});
