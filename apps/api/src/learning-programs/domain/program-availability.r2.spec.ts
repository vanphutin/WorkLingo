import {describe,it,expect} from 'vitest';
import {deriveProgramAccess} from './program-availability.js';
describe('R2 selectable program boundaries',()=>{
 it('opens only published completion-policy custom programs',()=>{expect(deriveProgramAccess({slug:'work-english',availabilityStatus:'AVAILABLE',progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:['revision']})).toEqual({destination:'/dashboard',isSelectable:true});for(const value of [{progressionPolicy:'MASTERY',curriculumRevisionIds:['revision']},{progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:[]}])expect(deriveProgramAccess({slug:'work-english',availabilityStatus:'AVAILABLE',...value}).isSelectable).toBe(false);});
 it.each(['beginner','toeic'])('cannot promote reserved %s using completion pins',slug=>{expect(deriveProgramAccess({slug,availabilityStatus:'AVAILABLE',progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:['revision']}).isSelectable).toBe(false);});
});
