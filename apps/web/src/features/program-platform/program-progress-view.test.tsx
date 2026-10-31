import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import type {ProgramProgressDto} from '@worklingo/contracts';
import {ProgramProgressView} from './program-progress-view';
import {apiClient,ApiError} from '../../lib/api/api-client';
import {LocaleProvider} from '../../i18n/provider';
const push=vi.fn();vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const id='11111111-1111-4111-8111-111111111111';
const lessonVersionId='22222222-2222-4222-8222-222222222222';
export const projection:ProgramProgressDto={enrollmentId:id,programVersionId:id,status:'ACTIVE',engineVersion:'program-progression-v1',policyVersion:1,projectedAt:'2026-10-31T00:00:00.000Z',completed:false,ready:false,completionPercentage:75,mastery:{status:'UNKNOWN',score:null,qualifiedAttempts:0},evidenceDimensions:[{dimension:'grammar',status:'PENDING',score:null,qualifiedAttempts:0,sources:['AI'],reason:'pending_feedback'}],stages:[{id:'stage',title:'Stage one',itemCount:1,completedCount:0,ready:false}],units:[{id:'unit',title:'Unit one',itemCount:1,completedCount:0,ready:false}],estimatedRemainingMinutes:15,nextAction:{type:'learn',curriculumRevisionId:id,lessonVersionId,sessionId:null,reasons:[]},items:[{curriculumRevisionId:'unit',pathId:'path',levelId:'stage',missionId:id,lessonVersionId,title:'Finish request',objectives:['Ask politely'],required:true,order:1,state:'in_progress',eligible:true,readinessReasons:['activities_incomplete'],reasons:[],completed:false,completionRatio:0.75,ready:false,mastery:{status:'UNKNOWN',score:null,qualifiedAttempts:0},attempts:1,retryAt:null,remediation:false,availableDurations:[60,90],recommendedDurationMinutes:60,activeSessionId:null,reviewDueAt:null,reviewCompleted:false,estimatedMinutes:15}]};
it('separates unknown mastery from completion and starts exact lesson using server durations',async()=>{
 const start=vi.spyOn(apiClient,'createCurriculumSession').mockResolvedValue({id:'session'} as never);
 render(<ProgramProgressView progress={projection}/>);
 expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);expect(screen.getByText('75%')).toBeInTheDocument();
 const duration=screen.getByLabelText('Session duration');expect(within(duration).queryByRole('option',{name:'45'})).not.toBeInTheDocument();expect(duration).toHaveValue('60');
 fireEvent.click(screen.getByRole('button',{name:'Start lesson'}));
 await waitFor(()=>expect(start).toHaveBeenCalledWith(expect.objectContaining({missionId:id,expectedCurriculumRevisionId:'unit',lessonVersionId,durationMinutes:60,clientSessionId:expect.any(String)})));
 expect(push).toHaveBeenCalledWith('/sessions/session');
});
it('uses returned allowed durations on rejected continuation while retaining same target UUID for retries',async()=>{
 const start=vi.spyOn(apiClient,'createCurriculumSession').mockRejectedValueOnce(new ApiError({code:'PROGRAM_DURATION_CANNOT_COVER_PENDING_ACTIVITIES',message:'Choose allowed duration',status:422,availableDurations:[90]})).mockResolvedValue({id:'session'} as never);
 render(<ProgramProgressView progress={projection}/>);fireEvent.click(screen.getByRole('button',{name:'Start lesson'}));
 await waitFor(()=>expect(screen.getByLabelText('Session duration')).toHaveValue('90'));
 fireEvent.click(screen.getByRole('button',{name:'Start lesson'}));await waitFor(()=>expect(start).toHaveBeenCalledTimes(2));expect(start.mock.calls[1]?.[0].durationMinutes).toBe(90);
});
it('renders inactive history without start actions in Vietnamese',()=>{
 render(<LocaleProvider initialLocale="vi"><ProgramProgressView progress={{...projection,status:'SUSPENDED'}}/></LocaleProvider>);
 expect(screen.getByText('Năng lực có minh chứng')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Bắt đầu bài học'})).not.toBeInTheDocument();expect(screen.getByText(/chỉ cho xem/)).toBeInTheDocument();
});
it('formats qualified score percentages and labels the server observation timestamp',()=>{
 render(<ProgramProgressView progress={{...projection,mastery:{status:'MASTERED',score:0.8,qualifiedAttempts:2}}}/>);
 expect(screen.getByText(/80%/)).toBeInTheDocument();expect(screen.getByText(/Progress observed/)).toBeInTheDocument();
});
