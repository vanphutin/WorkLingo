import '@testing-library/jest-dom/vitest';
import {render,screen,cleanup,fireEvent,act} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {ActivityRenderer} from './activity-renderer';
import type {LearnerActivityDto} from '../../lib/api/api-client';
const recorder=vi.hoisted(()=>vi.fn(()=>{throw new Error('Preview mounted learner recorder');}));
vi.mock('./use-audio-recorder',()=>({useAudioRecorder:recorder}));
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
const base={id:'preview',slug:'respond',learningBlock:'respond' as const,skills:['speaking' as const],content:[],languageBlocks:[],payload:{prompt:'Introduce yourself',mode:'guided_response',minWords:1}};
describe('side-effect-free Admin renderer mode',()=>{
 it('never mounts the learner recorder for speaking preview',()=>{
  expect(()=>render(<ActivityRenderer mode="admin-preview" activity={{...base,activityType:'speaking'} as LearnerActivityDto} value="" onChange={vi.fn()}/>)).not.toThrow();
  expect(screen.getByRole('textbox')).toBeInTheDocument();expect(recorder).not.toHaveBeenCalled();
 });
 it('allows local writing practice without autosaving learner drafts',async()=>{
  vi.useFakeTimers();const fetcher=vi.fn().mockResolvedValue({ok:false,status:404,json:async()=>({})});vi.stubGlobal('fetch',fetcher);
  render(<ActivityRenderer mode="admin-preview" activity={{...base,activityType:'writing',skills:['writing']} as LearnerActivityDto} value="" onChange={vi.fn()}/>);
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'I am Linh.'}});
  await act(async()=>{await vi.advanceTimersByTimeAsync(1500);});
  expect(screen.getByText(/Preview only/)).toBeInTheDocument();expect(fetcher).not.toHaveBeenCalled();
 });
});
