import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {EnrolledPrograms} from './enrolled-programs';
import {ProgramPlatformClient} from '../../lib/api/program-platform-client';
import {learningProgramClient} from '../../lib/api/learning-program-client';
const id='11111111-1111-4111-8111-111111111111';
const push=vi.fn(),refresh=vi.fn();vi.mock('next/navigation',()=>({useRouter:()=>({push,refresh})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('shows pinned release display after archive and selects the assigned active context without discovery access',async()=>{
 vi.spyOn(ProgramPlatformClient.prototype,'enrollmentsMine').mockResolvedValue({items:[{id,programId:id,programVersionId:id,status:'ACTIVE',display:{programSlug:'archived-program',programName:'Old name',release:{id,version:3,source:'AUTHORED',status:'RETIRED',title:'Pinned requests',description:'Historical release',objectives:['Ask politely']}}}] as never,page:1,total:1,limit:25});
 const current={activeProgram:{id,slug:'intermediate',name:'Intermediate'},enrollment:{id,revision:5,currentLevel:null}};
 const activate=vi.spyOn(learningProgramClient,'activateProgram').mockResolvedValue(current);
 render(<EnrolledPrograms initialContext={current}/>);
 expect(await screen.findByRole('heading',{name:'Pinned requests'})).toBeInTheDocument();expect(screen.getByText(/Version 3/)).toBeInTheDocument();expect(screen.getByText('Ask politely')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Resume session'}));await waitFor(()=>expect(activate).toHaveBeenCalledWith({programSlug:'archived-program',expectedRevision:5}));expect(push).toHaveBeenCalledWith('/dashboard');expect(refresh).toHaveBeenCalled();
});
