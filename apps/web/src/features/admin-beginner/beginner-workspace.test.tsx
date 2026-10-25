import '@testing-library/jest-dom/vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {beginnerEditorialPlan} from '@worklingo/contracts';
import {beginnerAdminClient} from '../../lib/api/beginner-admin-client';
import {BeginnerWorkspace} from './beginner-workspace';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('Beginner editorial workspace',()=>{
 it('shows two Paths and an honest planned map without any mutation',async()=>{
  vi.spyOn(beginnerAdminClient,'workspace').mockResolvedValue({plan:beginnerEditorialPlan,paths:[],bindings:[],writesEnabled:false,actions:[],environmentId:null});
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  render(<BeginnerWorkspace/>);
  expect(await screen.findByRole('heading',{name:'Beginner curriculum'})).toBeInTheDocument();
  expect(screen.getByText('5 Stages · 20 Units · 80 planned Lessons')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Mất gốc'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cơ bản'}));
  expect(screen.getByText(/CB-A1/)).toBeInTheDocument();
  expect(screen.getByText(/Separate environment permission/)).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();vi.unstubAllGlobals();
 });
});
