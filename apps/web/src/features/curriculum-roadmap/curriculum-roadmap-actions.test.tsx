import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {CurriculumRoadmap} from './curriculum-roadmap';
import {apiClient} from '../../lib/api/api-client';
const {push}=vi.hoisted(()=>({push:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const item={missionId:'33333333-3333-4333-8333-333333333333',revisionId:'44444444-4444-4444-8444-444444444444',title:'First task',state:'available' as const,unmetPrerequisites:[],reviewDue:false,activeSessionId:null,objectives:[]};
const roadmap={programId:'11111111-1111-4111-8111-111111111111',enrollmentId:'22222222-2222-4222-8222-222222222222',items:[item]};
it('starts the selected available mission with its exact revision and navigates to the stored session',async()=>{
 const create=vi.spyOn(apiClient,'createCurriculumSession').mockResolvedValue({id:'saved-session'} as never);
 render(<CurriculumRoadmap roadmap={roadmap}/>);
 fireEvent.click(screen.getByRole('button',{name:'Start First task'}));
 await waitFor(()=>expect(create).toHaveBeenCalledWith(expect.objectContaining({missionId:item.missionId,expectedCurriculumRevisionId:item.revisionId,durationMinutes:45,clientSessionId:expect.any(String)})));
 expect(push).toHaveBeenCalledWith('/sessions/saved-session');
});
it('retains the idempotency key on network retry and exposes an error without unlocking anything',async()=>{
 const create=vi.spyOn(apiClient,'createCurriculumSession').mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValue({id:'saved-session'} as never);
 render(<CurriculumRoadmap roadmap={roadmap}/>);
 fireEvent.click(screen.getByRole('button',{name:'Start First task'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
 fireEvent.click(screen.getByRole('button',{name:'Start First task'}));
 await waitFor(()=>expect(create).toHaveBeenCalledTimes(2));
 expect(create.mock.calls[0]?.[0].clientSessionId).toBe(create.mock.calls[1]?.[0].clientSessionId);
});
it('offers resume for an existing session and no fresh start for locked or completed cards',()=>{
 render(<CurriculumRoadmap roadmap={{...roadmap,items:[{...item,state:'locked'},{...item,revisionId:'55555555-5555-4555-8555-555555555555',state:'in_progress',activeSessionId:'existing'}]}}/>);
 expect(screen.queryByRole('button',{name:/start/i})).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Resume First task'})).toHaveAttribute('href','/sessions/existing');
});

it('uses the selected supported duration for a targeted session',async()=>{
 const create=vi.spyOn(apiClient,'createCurriculumSession').mockResolvedValue({id:'saved-session'} as never);
 render(<CurriculumRoadmap roadmap={roadmap}/>);
 fireEvent.change(screen.getByLabelText('Session duration'),{target:{value:'60'}});
 fireEvent.click(screen.getByRole('button',{name:'Start First task'}));
 await waitFor(()=>expect(create).toHaveBeenCalledWith(expect.objectContaining({durationMinutes:60})));
});
