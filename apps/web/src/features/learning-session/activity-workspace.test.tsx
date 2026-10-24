import '@testing-library/jest-dom/vitest';
import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {ActivityWorkspace} from './activity-workspace';
import type {LearnerActivityDto} from '../../lib/api/api-client';
afterEach(cleanup);
it('renders only current phase instruction as inert teaching text, independently of evidence',()=>{
  const activity={id:'a',slug:'a',activityType:'writing',learningBlock:'respond',skills:['writing'],content:[],languageBlocks:[],payload:{},instructions:[{slug:'guide',phase:'respond',order:0,text:'Viết câu của bạn.'},{slug:'later',phase:'listenReason',order:0,text:'Do not display another phase.'}]} as LearnerActivityDto;
  render(<ActivityWorkspace activity={activity}><p>Response</p></ActivityWorkspace>);
  expect(screen.getByText('Viết câu của bạn.')).toBeInTheDocument();expect(screen.queryByText('Do not display another phase.')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/complete|mastery/i})).not.toBeInTheDocument();
});
