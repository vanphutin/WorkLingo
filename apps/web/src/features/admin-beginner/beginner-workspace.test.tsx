import '@testing-library/jest-dom/vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {beginnerEditorialPlan,type BeginnerTarget} from '@worklingo/contracts';
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

it('opens a new draft for the same logical Lesson without modifying its published import',async()=>{
 const id=(n:number)=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const target={programId:id(1),pathId:id(2),levelId:id(3),missionId:id(4),lessonId:id(5),importId:id(6)};
 const source='FORMAT: WorkLingoLesson/1.2\n\n[LESSON fixture]\ntitle: Fixture V1\nobjective: Read\nduration_minutes: 45\n';
 const draft={id:id(6),lessonId:id(5),lessonVersionId:id(7),rawSource:source,sourceHash:'a'.repeat(64),status:'PUBLISHED' as const,draftRevision:3,parserVersion:'1.0.0',validationHash:'a'.repeat(64),createdById:id(8),updatedById:id(8),createdAt:'2026-10-25',updatedAt:'2026-10-25'};
 vi.spyOn(beginnerAdminClient,'workspace').mockResolvedValue({plan:beginnerEditorialPlan,paths:[],bindings:[{editorialCode:'MG01-L1',target,status:'PUBLISHED',draftRevision:3,sourceHash:draft.sourceHash,reviewHash:null,lessonVersions:[{id:id(7),version:1,status:'PUBLISHED'}]}],writesEnabled:true,actions:['read','author'],environmentId:'isolated-unit'});
 vi.spyOn(beginnerAdminClient,'getImport').mockResolvedValue({draft,reviewHash:null,reviewKind:null,audioArtifacts:[],selectedAudioArtifacts:{}});
 const next:BeginnerTarget={...target};delete next.importId;
 const create=vi.spyOn(beginnerAdminClient,'createDraft').mockResolvedValue({draft:{...draft,id:id(9),lessonVersionId:null,status:'DRAFT',draftRevision:1},target:{...next,importId:id(9)}});
 const update=vi.spyOn(beginnerAdminClient,'updateSource');
 render(<BeginnerWorkspace/>);
 fireEvent.click(await screen.findByRole('button',{name:/MG01-L1/,hidden:true}));
 await waitFor(()=>expect(screen.getByLabelText('Lesson source')).toHaveValue(source));
 expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Create a new draft'}));
 const edited=source.replace('V1','V2');fireEvent.change(screen.getByLabelText('Lesson source'),{target:{value:edited}});
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(create).toHaveBeenCalledOnce());
 expect(create.mock.calls[0]![0]).toMatchObject({target:next,expectedRevision:null,rawSource:edited,editorialCode:'MG01-L1',selectedAudioArtifacts:{}});
 expect(create.mock.calls[0]![0].target).not.toHaveProperty('importId');expect(update).not.toHaveBeenCalled();
});
