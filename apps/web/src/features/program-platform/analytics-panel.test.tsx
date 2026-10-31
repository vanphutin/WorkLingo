import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AnalyticsPanel} from './analytics-panel';
import {ProgramPlatformClient} from '../../lib/api/program-platform-client';
import {LocaleProvider} from '../../i18n/provider';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('requires an explicit UTC window and displays null denominators as unknown',async()=>{
 const analytics=vi.spyOn(ProgramPlatformClient.prototype,'analytics').mockResolvedValue({summary:{completionRate:null,unknownProjectionEnrollments:3},definitions:{completion:'Authoritative completion definition'},versions:{items:[],page:1,total:0,limit:25},nodes:{items:[],page:1,total:0,limit:25},skills:[],retention:[],reviews:{basis:'CURRENT',asOf:'2026-10-31T00:00:00.000Z',scheduled:0,overdue:0,completedEventsInWindow:0},assessments:{total:0,statuses:[]}} as never);
 vi.spyOn(ProgramPlatformClient.prototype,'versions').mockResolvedValue({items:[],page:1,total:0,limit:25});
 render(<AnalyticsPanel programId="11111111-1111-4111-8111-111111111111"/>);
 expect(analytics).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('From (UTC)'),{target:{value:'2026-10-01'}});fireEvent.change(screen.getByLabelText('To (UTC, exclusive)'),{target:{value:'2026-10-31'}});fireEvent.click(screen.getByRole('button',{name:'Load analytics'}));
 expect((await screen.findAllByText('Unknown')).length).toBeGreaterThan(0);expect(screen.getByText('Authoritative completion definition')).toBeInTheDocument();
 expect(analytics).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({from:'2026-10-01T00:00:00.000Z',to:'2026-10-31T00:00:00.000Z'}));
});
it('pages version comparisons and nodes independently without changing the UTC cohort',async()=>{
 const counts={totalEnrollments:2,cohortEnrollments:2,cohortStatus:{ACTIVE:1,SUSPENDED:1,COMPLETED:0,WITHDRAWN:0},activeLearners:1,completedEnrollments:0,withdrawnEnrollments:0,projectedEnrollments:1,activityCompletedEnrollments:0,readyEnrollments:0,unknownProjectionEnrollments:1,completionRate:0};
 const analytics=vi.spyOn(ProgramPlatformClient.prototype,'analytics').mockResolvedValue({summary:counts,definitions:{},versions:{items:[{...counts,versionId:'version',version:2,title:'Requests',source:'AUTHORED'}],page:1,total:26,limit:25},nodes:{items:[{versionId:'version',type:'lesson',title:'Ask for details',totalEnrollments:2,observedEnrollments:1,unknownEnrollments:1,completedEnrollments:0,readyEnrollments:0,completionRate:0}],page:1,total:26,limit:25},skills:[],retention:[],reviews:{basis:'CURRENT',asOf:'2026-10-31T00:00:00.000Z',scheduled:0,overdue:0,completedEventsInWindow:0},assessments:{total:1,statuses:[{status:'passed',count:1}]}} as never);
 vi.spyOn(ProgramPlatformClient.prototype,'versions').mockResolvedValue({items:[],page:1,total:0,limit:25});
 render(<AnalyticsPanel programId="11111111-1111-4111-8111-111111111111"/>);
 fireEvent.change(screen.getByLabelText('From (UTC)'),{target:{value:'2026-10-01'}});fireEvent.change(screen.getByLabelText('To (UTC, exclusive)'),{target:{value:'2026-10-31'}});fireEvent.click(screen.getByRole('button',{name:'Load analytics'}));
 expect(await screen.findByRole('heading',{name:'Version 2 · Requests'})).toBeInTheDocument();expect(screen.getByText('Passed: 1')).toBeInTheDocument();
 const versionSection=screen.getByRole('heading',{name:'Version comparison'}).parentElement!;fireEvent.click(within(versionSection).getByRole('button',{name:'Next page'}));
 await waitFor(()=>expect(analytics).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({versionPage:2,nodePage:1,from:'2026-10-01T00:00:00.000Z'})));
 const nodeSection=screen.getByRole('heading',{name:'Stages, units and lessons'}).parentElement!;await waitFor(()=>expect(within(nodeSection).getByRole('button',{name:'Next page'})).toBeEnabled());fireEvent.click(within(nodeSection).getByRole('button',{name:'Next page'}));
 await waitFor(()=>expect(analytics).toHaveBeenLastCalledWith(expect.any(String),expect.objectContaining({versionPage:2,nodePage:2})));
});
it('presents localized cohort meanings, percentages and review timestamps in Vietnamese',async()=>{
 vi.spyOn(ProgramPlatformClient.prototype,'versions').mockResolvedValue({items:[],page:1,total:0,limit:25});
 vi.spyOn(ProgramPlatformClient.prototype,'analytics').mockResolvedValue({from:'2026-10-01T00:00:00.000Z',to:'2026-10-31T00:00:00.000Z',generatedAt:'2026-10-31T03:15:00.000Z',summary:{completionRate:0.5},definitions:{completion:'English backend definition'},versions:{items:[],page:1,total:0,limit:25},nodes:{items:[],page:1,total:0,limit:25},skills:[{dimension:'grammar',meanQualifiedScore:0.75}],retention:[{day:7,rate:null}],reviews:{basis:'CURRENT',asOf:'2026-10-31T03:15:00.000Z',scheduled:2,overdue:1,completedEventsInWindow:0},assessments:{total:0,statuses:[]}} as never);
 render(<LocaleProvider initialLocale="vi"><AnalyticsPanel programId="11111111-1111-4111-8111-111111111111"/></LocaleProvider>);
 fireEvent.change(screen.getByLabelText('Từ (UTC)'),{target:{value:'2026-10-01'}});fireEvent.change(screen.getByLabelText('Đến (UTC, không bao gồm)'),{target:{value:'2026-10-31'}});fireEvent.click(screen.getByRole('button',{name:'Tải phân tích'}));
 expect(await screen.findByText('50%')).toBeInTheDocument();expect(screen.getByText('75%')).toBeInTheDocument();
 expect(screen.getByRole('table',{name:'Các chiều minh chứng'})).toBeInTheDocument();expect(screen.getByText('Ngữ pháp')).toBeInTheDocument();
 expect(screen.getByText(/Chỉ các ghi danh đã đủ toàn bộ khoảng theo dõi/)).toBeInTheDocument();expect(screen.queryByText('English backend definition')).not.toBeInTheDocument();
 expect(screen.getAllByText(/31\/10\/2026/).length).toBeGreaterThan(0);
});
