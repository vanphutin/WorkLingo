import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {ProgramCatalog} from './program-catalog';
import {learningProgramClient} from '../../lib/api/learning-program-client';
const {push}=vi.hoisted(()=>({push:vi.fn()}));vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('enrolls a generic available program using current context revision before navigating',async()=>{
 vi.spyOn(learningProgramClient,'getCatalog').mockResolvedValue({programs:[{slug:'workplace-new',name:'Workplace',description:'Practice English',learningGoal:'Handle requests',proficiencyLabel:'A2',iconKey:'intermediate',isSelectable:true,destination:'/dashboard',availabilityStatus:'AVAILABLE',publishedLevelCount:1,publishedPathCount:1}]});
 vi.spyOn(learningProgramClient,'getContext').mockResolvedValue({activeProgram:{id:'11111111-1111-4111-8111-111111111111',slug:'intermediate',name:'Intermediate'},enrollment:{id:'22222222-2222-4222-8222-222222222222',revision:3,currentLevel:null}});
 const enroll=vi.spyOn(learningProgramClient,'enrollProgram').mockResolvedValue({activeProgram:{id:'33333333-3333-4333-8333-333333333333',slug:'workplace-new',name:'Workplace'},enrollment:{id:'44444444-4444-4444-8444-444444444444',revision:4,currentLevel:null}});
 render(<ProgramCatalog/>);fireEvent.click(await screen.findByRole('button',{name:/open workplace/i}));
 await waitFor(()=>expect(enroll).toHaveBeenCalledWith({programSlug:'workplace-new',expectedRevision:3}));expect(push).toHaveBeenCalledWith('/dashboard');
});
