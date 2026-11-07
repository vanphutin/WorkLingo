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

it.each(['reading','listening'] as const)('renders and completes semantic %s answers without an invented option',async(skill)=>{
 const {isActivityComplete}=await import('./activity-renderer');
 const activity={...base,activityType:skill,skills:[skill],learningBlock:skill==='reading'?'readDecode':'listenReason',payload:{prompt:'Explain the message',questions:[{slug:'why',prompt:'Why is she writing?',responseType:'open_ended',options:[]}]}} as LearnerActivityDto;
 const onChange=vi.fn();
 render(<ActivityRenderer mode="admin-preview" activity={activity} value={{answerIndexes:[],answers:[]}} onChange={onChange}/>);
 fireEvent.change(screen.getByRole('textbox',{name:/Why is she writing/}),{target:{value:'She wants help.'}});
 expect(onChange).toHaveBeenCalledWith({answerIndexes:[-1],answers:['She wants help.']});
 expect(isActivityComplete(activity,{answerIndexes:[-1],answers:['She wants help.']})).toBe(true);
 expect(isActivityComplete(activity,{answerIndexes:[-1],answers:[' ']})).toBe(false);
});

it.each(['true_false','matching'] as const)('retains keyboard-native choices for %s',type=>{
 const onChange=vi.fn();
 const options=type==='true_false'?['True','False']:['Monday','Tuesday'];
 const activity={...base,activityType:'reading',skills:['reading'],payload:{prompt:'Read',questions:[{slug:'q',prompt:'Choose the matching answer',responseType:type,options}]}} as LearnerActivityDto;
 render(<ActivityRenderer mode="admin-preview" activity={activity} value={{answerIndexes:[]}} onChange={onChange}/>);
 fireEvent.click(screen.getByRole('radio',{name:options[1]!}));
 expect(onChange).toHaveBeenCalledWith({answerIndexes:[1]});
});
