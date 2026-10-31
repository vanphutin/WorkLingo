import {expect,it} from 'vitest';
import {programEnrollmentSchema,learningProgramCatalogItemSchema} from './index.ts';
const id='11111111-1111-4111-8111-111111111111';
it('accepts safe owned display metadata and rejects private release payload fields',()=>{
 const display={programSlug:'requests',programName:'Requests',release:{id,version:2,source:'AUTHORED',status:'RETIRED',title:'Pinned title',description:'Pinned description',objectives:['Ask'],difficulty:'A2',estimatedMinutes:60,supportedLanguages:['en'],audiences:['adult']}};
 const row={id,learnerId:id,programId:id,programVersionId:id,status:'ACTIVE',revision:1,currentLevelId:null,curriculumRevisionIds:[],createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-01T00:00:00.000Z',display};
 expect(programEnrollmentSchema.safeParse(row).success).toBe(true);
 expect(programEnrollmentSchema.safeParse({...row,display:{...display,release:{...display.release,activities:[{answer:'secret'}]}}}).success).toBe(false);
 expect(learningProgramCatalogItemSchema.safeParse({availabilityStatus:'AVAILABLE',description:'Description',destination:'/dashboard',iconKey:'intermediate',isSelectable:true,learningGoal:'Ask',name:'Requests',proficiencyLabel:'A2',publishedLevelCount:1,publishedPathCount:1,slug:'requests',id,currentRelease:{...display.release,status:'PUBLISHED'}}).success).toBe(true);
});
