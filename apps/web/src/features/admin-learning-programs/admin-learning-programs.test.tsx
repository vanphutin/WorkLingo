import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AdminLearningPrograms} from './admin-learning-programs';
import {ProgramPlatformClient} from '../../lib/api/program-platform-client';
import {ApiError} from '../../lib/api/api-client';
import {LearningProgramClient} from '../../lib/api/learning-program-client';
function mockPanels(){vi.spyOn(ProgramPlatformClient.prototype,'versions').mockResolvedValue({items:[],total:0,page:1,limit:25});vi.spyOn(ProgramPlatformClient.prototype,'options').mockResolvedValue({items:[],total:0,page:1,limit:25,vocabularyLibrary:{searchPath:'/api/v1/admin/vocabulary/entries',detailPath:'/api/v1/admin/vocabulary/entries/:id',provenancePath:'/api/v1/admin/vocabulary/entries/:id/provenance'}});}
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const program={id:'11111111-1111-4111-8111-111111111111',slug:'workplace-new',name:'Workplace',description:'Useful English',learningGoal:'Handle requests',proficiencyLabel:'A2',iconKey:'intermediate' as const,displayOrder:5,availabilityStatus:'IN_DEVELOPMENT' as const,revision:1,progressionPolicy:'ACTIVITY_COMPLETION' as const,curriculumRevisionIds:[]};
it('creates metadata and opens the release workspace without manual reference authoring',async()=>{
 mockPanels();
 vi.spyOn(LearningProgramClient.prototype,'listPrograms').mockResolvedValue({programs:[]});
 const create=vi.spyOn(LearningProgramClient.prototype,'createProgram').mockResolvedValue(program);

 render(<AdminLearningPrograms/>);
 await screen.findByRole('heading',{name:'Learning programs'});
 for(const [label,value] of Object.entries({'Slug':'workplace-new','Name':'Workplace','Description':'Useful English','Learning goal':'Handle requests','Proficiency label':'A2','Display order':'5'}))fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByRole('button',{name:'Create program'}));
 await waitFor(()=>expect(create).toHaveBeenCalled());
 expect(await screen.findByRole('heading',{name:'Published curriculum revisions'})).toBeInTheDocument();
 expect(screen.queryByLabelText('Curriculum revision IDs')).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Open curriculum builder'})).toHaveAttribute('href',`/admin/curriculum?programId=${program.id}`);
});
it('keeps edits and an error visible when saving fails',async()=>{
 mockPanels();
 vi.spyOn(LearningProgramClient.prototype,'listPrograms').mockResolvedValue({programs:[program]});
 vi.spyOn(LearningProgramClient.prototype,'updateProgram').mockRejectedValue(new ApiError({status:409,code:'PROGRAM_VERSION_REVISION_STALE',message:'Stale revision'}));
 render(<AdminLearningPrograms/>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit Workplace'}));
 fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Edited name'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 expect(await screen.findByRole('alert')).toBeInTheDocument();
 expect(screen.getByLabelText('Name')).toHaveValue('Edited name');
});
