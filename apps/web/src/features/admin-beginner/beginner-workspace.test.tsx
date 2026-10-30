import '@testing-library/jest-dom/vitest';
import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {beginnerEditorialPlan,type BeginnerTarget} from '@worklingo/contracts';
import {beginnerAdminClient} from '../../lib/api/beginner-admin-client';
import {AdminNavigationGuardProvider} from '../admin-dashboard/admin-navigation-guard';
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

const fixtureId=(n:number)=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
function setupWorkspace(){
 const target={programId:fixtureId(1),pathId:fixtureId(2),levelId:fixtureId(3),missionId:fixtureId(4),lessonId:fixtureId(5),importId:fixtureId(6)};
 const source='FORMAT: WorkLingoLesson/1.2\n[LESSON fixture]\ntitle: Original\nobjective: Read\nduration_minutes: 45\n[/LESSON]\n';
 const draft={id:fixtureId(6),lessonId:fixtureId(5),lessonVersionId:null,rawSource:source,sourceHash:'a'.repeat(64),status:'DRAFT' as const,draftRevision:3,parserVersion:'1.0.0',validationHash:null,createdById:fixtureId(8),updatedById:fixtureId(8),createdAt:'2026-10-25',updatedAt:'2026-10-25'};
 const data={draft,reviewHash:null,reviewKind:null,audioArtifacts:[],selectedAudioArtifacts:{}};
 vi.spyOn(beginnerAdminClient,'workspace').mockResolvedValue({plan:beginnerEditorialPlan,programId:target.programId,paths:[{id:target.pathId,programId:target.programId,slug:'mat-goc',name:'Path',status:'DRAFT',revision:1,levels:[{id:target.levelId,pathId:target.pathId,code:'MG_F0',name:'Stage',status:'DRAFT',revision:1,missions:['MG01','MG02'].map((code,i)=>({id:fixtureId(4+i*10),slug:code.toLowerCase(),title:code,objective:'Read',order:i+1,revision:1,status:'DRAFT',curriculumRevisions:[]}))}]}],bindings:[{editorialCode:'MG01-L1',target,status:'DRAFT',draftRevision:3,sourceHash:draft.sourceHash,reviewHash:null,lessonVersions:[]}],writesEnabled:true,actions:['read','author','validate'],environmentId:'isolated-unit'});
 const getImport=vi.spyOn(beginnerAdminClient,'getImport').mockResolvedValue(data);
 return {target,source,data,getImport};
}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}

it.each(['validate','reload'] as const)('preserves raw and structured edits during %s latency',async phase=>{
 const {source,data,getImport}=setupWorkspace();
 const validation=deferred<Awaited<ReturnType<typeof beginnerAdminClient.validate>>>();
 const reload=deferred<typeof data>();
 vi.spyOn(beginnerAdminClient,'validate').mockReturnValue(validation.promise);
 render(<BeginnerWorkspace/>);
 fireEvent.click(await screen.findByRole('button',{name:/MG01-L1/,hidden:true}));
 await waitFor(()=>expect(screen.getByLabelText('Lesson source')).toHaveValue(source));
 getImport.mockReturnValueOnce(reload.promise);
 fireEvent.click(screen.getByRole('button',{name:'Validate'}));
 if(phase==='reload'){
  await act(async()=>{validation.resolve({} as Awaited<ReturnType<typeof beginnerAdminClient.validate>>);});
  await waitFor(()=>expect(getImport).toHaveBeenCalledTimes(2));
 }
 fireEvent.change(screen.getByLabelText('Lesson source'),{target:{value:source+'\n# late raw edit'}});
 fireEvent.change(screen.getByLabelText(/Lesson\s+· title/),{target:{value:'Later structured title'}});
 const edited=source.replace('title: Original','title: Later structured title')+'\n# late raw edit';
 await act(async()=>{
  if(phase==='validate')validation.resolve({} as Awaited<ReturnType<typeof beginnerAdminClient.validate>>);
 });
 await waitFor(()=>expect(getImport).toHaveBeenCalledTimes(2));
 await act(async()=>{reload.resolve(data);});
 expect(screen.getByLabelText('Lesson source')).toHaveValue(edited);
 expect(screen.getByRole('button',{name:'Validate'})).toBeDisabled();
});

it.each(['Path','Lesson','Unit'])('guards dirty Foundation edits on a %s switch',async destination=>{
 setupWorkspace();
 const definition={category:'grammar' as const,prerequisiteRevisionIds:[],objectives:[{slug:'read',statement:'Original objective',skills:['reading' as const],required:true,evidence:[{lessonVersionId:fixtureId(5),activitySlug:'read',languageBlockSlugs:[]}]}]};
 vi.spyOn(beginnerAdminClient,'foundation').mockImplementation(target=>({getDraft:vi.fn().mockResolvedValue({missionId:target.missionId,revision:1,status:'DRAFT',definition,publishedRevisions:[],reviewedRevision:null,reviewHash:null}),saveDraft:vi.fn(),validateDraft:vi.fn(),publishDraft:vi.fn(),reviewDraft:vi.fn()}));
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 render(<AdminNavigationGuardProvider><BeginnerWorkspace/></AdminNavigationGuardProvider>);
 const unitButtons=await screen.findAllByRole('button',{name:'Unit objectives and prerequisites',hidden:true});
 fireEvent.click(unitButtons[0]!);
 fireEvent.change(await screen.findByLabelText('Objective statement'),{target:{value:'Unsaved Foundation objective'}});
 const destinationButton=destination==='Path'?screen.getByRole('button',{name:'Cơ bản'}):destination==='Lesson'?screen.getByRole('button',{name:/MG01-L1/,hidden:true}):unitButtons[1]!;
 fireEvent.click(destinationButton);
 expect(screen.getByLabelText('Objective statement')).toHaveValue('Unsaved Foundation objective');
 expect(confirm).toHaveBeenCalledOnce();
 confirm.mockReturnValue(true);
 fireEvent.click(destinationButton);
 await waitFor(()=>{
  if(destination==='Unit')expect(screen.getByLabelText('Objective statement')).toHaveValue('Original objective');
  else expect(screen.queryByLabelText('Objective statement')).not.toBeInTheDocument();
 });
});




it('keeps the existing standalone dirty lesson confirmation',async()=>{
 const {source}=setupWorkspace();
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
 render(<BeginnerWorkspace/>);
 fireEvent.click(await screen.findByRole('button',{name:/MG01-L1/,hidden:true}));
 await waitFor(()=>expect(screen.getByLabelText('Lesson source')).toHaveValue(source));
 fireEvent.change(screen.getByLabelText('Lesson source'),{target:{value:source+'\n# unsaved'}});
 fireEvent.click(screen.getByRole('button',{name:'Cơ bản'}));
 expect(screen.getByLabelText('Lesson source')).toHaveValue(source+'\n# unsaved');
 expect(confirm).toHaveBeenCalledOnce();
});

it('refreshes validation status when no later source edit occurred',async()=>{
 const {source,data,getImport}=setupWorkspace();
 vi.spyOn(beginnerAdminClient,'validate').mockResolvedValue({} as Awaited<ReturnType<typeof beginnerAdminClient.validate>>);
 render(<BeginnerWorkspace/>);
 fireEvent.click(await screen.findByRole('button',{name:/MG01-L1/,hidden:true}));
 await waitFor(()=>expect(screen.getByLabelText('Lesson source')).toHaveValue(source));
 getImport.mockResolvedValueOnce({...data,draft:{...data.draft,status:'VALIDATED'}});
 fireEvent.click(screen.getByRole('button',{name:'Validate'}));
 expect(await screen.findByText('Status: VALIDATED')).toBeInTheDocument();
 expect(screen.getByLabelText('Lesson source')).toHaveValue(source);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Validate'})).toBeEnabled());
});
