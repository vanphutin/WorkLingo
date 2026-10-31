import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MissionLessonPicker} from './mission-lesson-picker';
import {apiClient} from '../../lib/api/api-client';
import {adminCurriculumClient} from '../../lib/api/admin-curriculum-client';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('attaches real published lessons by human title without UUID authoring',async()=>{
 vi.spyOn(apiClient,'listContentImports').mockResolvedValue([{id:'import',lessonId:'lesson',lessonVersionId:'version',status:'PUBLISHED'}] as never);
 vi.spyOn(apiClient,'getContentPreview').mockResolvedValue({normalizedDraft:{title:'Polite requests',activities:[]}} as never);
 const replace=vi.spyOn(adminCurriculumClient,'replaceMissionLessons').mockResolvedValue({} as never);
 render(<MissionLessonPicker mission={{id:'mission',revision:3,lessons:[]} as never} onSaved={vi.fn()}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Add Polite requests'}));
 fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
 await waitFor(()=>expect(replace).toHaveBeenCalledWith('mission',expect.objectContaining({lessonIds:['lesson'],expectedRevision:3})));
 expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
