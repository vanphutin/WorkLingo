import '@testing-library/jest-dom/vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import {BeginnerLearnerPreview} from './beginner-learner-preview';
import type {BeginnerPreviewData} from '../../lib/api/beginner-admin-client';
const captured=vi.hoisted(()=>({props:null as Record<string,unknown>|null}));
vi.mock('../learning-session/activity-renderer',()=>({ActivityRenderer:(props:Record<string,unknown>)=>{captured.props=props;return <div>Safe activity</div>;}}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('mounts only redacted activities in explicit local preview mode without session identity',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const data={kind:'PUBLISHED_PREVIEW',title:'Historical V1',lessonVersionId:'10000000-0000-4000-8000-000000000011',activities:[{id:'one',slug:'read',activityType:'reading'},{id:'two',slug:'speak',activityType:'speaking'}],audio:[]} as unknown as BeginnerPreviewData;
 const close=vi.fn();render(<BeginnerLearnerPreview data={data} target={{programId:'10000000-0000-4000-8000-000000000001'}} onClose={close}/>);
 expect(captured.props).toMatchObject({mode:'admin-preview',activity:{id:'one'}});expect(captured.props).not.toHaveProperty('sessionId');
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'two'}});expect(captured.props).toMatchObject({activity:{id:'two'}});
 expect(fetcher).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Close preview'}));expect(close).toHaveBeenCalledOnce();
});
