import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssessmentPanel } from './assessment-panel';
import { assessmentClient } from '../../lib/api/assessment-client';
import type { AssessmentResult } from '@worklingo/contracts';

const run = { schemaVersion:'assessment/1',id:'00000000-0000-4000-8000-000000000001',submissionId:'00000000-0000-4000-8000-000000000002',learnerId:'00000000-0000-4000-8000-000000000003',programVersionId:null,lessonVersionId:'00000000-0000-4000-8000-000000000004',activityId:'00000000-0000-4000-8000-000000000005',skill:'writing',rubricId:'writing',rubricVersion:'1',policyVersion:'1',promptVersion:'1',inputHash:'a'.repeat(64),contextHash:'b'.repeat(64),status:'NEEDS_REVIEW',criteria:[{id:'meaning',description:'Meaning',required:true,weight:1,maximumScore:3,rawScore:null,level:null,status:'NEEDS_EVIDENCE',evidenceIds:[],rationale:'Evidence is missing',feedback:'Try another recording.'}],totalScore:null,maximumScore:100,evidence:[],feedback:'More evidence is needed.',confidence:'LOW',corrections:[{start:2,end:4,replacement:'am',explanation:'Use am with I.'}],providers:[],previousEvaluationId:null,createdAt:'2026-11-07T00:00:00.000Z',completedAt:'2026-11-07T00:00:01.000Z' };
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('AssessmentPanel',()=>{
 it('discovers and cancels an in-flight evaluation without accepting its stale response',async()=>{
  let complete!:(value:AssessmentResult)=>void;let admitted=false;
  vi.spyOn(assessmentClient,'history').mockImplementation(async()=>({items:admitted?[{...run,status:'EVALUATING',completedAt:null} as AssessmentResult]:[]}));
  vi.spyOn(assessmentClient,'evaluate').mockImplementation(()=>{admitted=true;return new Promise(resolve=>{complete=resolve;});});
  vi.spyOn(assessmentClient,'cancel').mockResolvedValue({...run,status:'CANCELLED'} as AssessmentResult);
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Assess this response'}));
  const cancel=await screen.findByRole('button',{name:'Cancel evaluation'},{timeout:2500});
  expect(cancel).toBeEnabled();fireEvent.click(cancel);
  expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  await act(async()=>complete(run as AssessmentResult));
  expect(screen.getByText('Cancelled')).toBeInTheDocument();expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
 });
 it('ignores a previous attempt action after the panel changes attempt',async()=>{
  let complete!:(value:AssessmentResult)=>void;
  vi.spyOn(assessmentClient,'history').mockResolvedValue({items:[]});
  vi.spyOn(assessmentClient,'evaluate').mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));
  const view=render(<AssessmentPanel attemptId={run.submissionId}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Assess this response'}));
  view.rerender(<AssessmentPanel attemptId="00000000-0000-4000-8000-000000000009"/>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Assess this response'})).toBeEnabled());
  await act(async()=>complete(run as AssessmentResult));
  expect(screen.queryByText('More evidence is needed.')).not.toBeInTheDocument();
 });
 it('does not let an outstanding history poll replace cancellation',async()=>{
  let release!:(value:{items:AssessmentResult[]})=>void;let reads=0;
  vi.spyOn(assessmentClient,'history').mockImplementation(()=>{
   reads++;if(reads===1)return Promise.resolve({items:[]});
   if(reads===2)return Promise.resolve({items:[{...run,status:'EVALUATING',completedAt:null} as AssessmentResult]});
   return new Promise(resolve=>{release=resolve;});
  });
  vi.spyOn(assessmentClient,'evaluate').mockImplementation(()=>new Promise(()=>undefined));
  vi.spyOn(assessmentClient,'cancel').mockImplementation(async()=>{await Promise.resolve();return {...run,status:'CANCELLED'} as AssessmentResult;});
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Assess this response'}));
  await waitFor(()=>expect(reads).toBe(3),{timeout:2500});
  fireEvent.click(await screen.findByRole('button',{name:'Cancel evaluation'}));
  expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  await act(async()=>release({items:[{...run,status:'EVALUATING',completedAt:null} as AssessmentResult]}));
  expect(screen.queryByText('Evaluating')).not.toBeInTheDocument();
 });
 it('labels synthetic provider results so they cannot imply AI qualification',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[{...run,providers:[{role:'primary',name:null,model:null,modelFamily:null,requestId:null,inputTokens:null,outputTokens:null,costUsd:null,latencyMs:null,synthetic:true}]}]}))));
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  expect(await screen.findByText('Synthetic evaluation — not AI qualified')).toBeInTheDocument();
 });
 it('preserves a missing score, explains evidence gaps and highlights the submitted writing',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[run]}))));
  render(<AssessmentPanel attemptId={run.submissionId} responseText="I is here."/>);
  expect(await screen.findByText('More evidence is needed.')).toBeInTheDocument();
  expect(screen.getByText('Not scored')).toBeInTheDocument();
  expect(screen.getByText('Evidence needed')).toBeInTheDocument();
  expect(screen.getByText('is',{selector:'mark'})).toBeInTheDocument();
  expect(screen.queryByText('0 / 100')).not.toBeInTheDocument();
 });
 it('renders every skill and only public evidence with timestamp playback',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({items:['reading','listening','speaking','writing'].map((skill,i)=>({...run,id:run.id.slice(0,-1)+i,skill,corrections:[],evidence:[{id:'audio',source:'audio',quote:'Hello',start:null,end:null,startMs:1200,endMs:1800}]}))}))));
  render(<AssessmentPanel attemptId={run.submissionId} audioUrl="/recording.wav"/>);
  expect(await screen.findAllByRole('button',{name:'Play from 0:01'})).toHaveLength(4);
  for(const skill of ['Reading','Listening','Speaking','Writing']) expect(screen.getByText(skill)).toBeInTheDocument();
 });
 it('keeps history and creates a linked re-evaluation',async()=>{
  const requests:RequestInit[]=[];
  vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{requests.push(options);return new Response(JSON.stringify(options.method==='POST'?{...run,id:'00000000-0000-4000-8000-000000000006',status:'RECEIVED',completedAt:null}:{items:[run]}));}));
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Re-evaluate'}));
  expect(await screen.findByText('Received')).toBeInTheDocument();
  expect(JSON.parse(String(requests[1]?.body)).previousEvaluationId).toBe(run.id);
  expect(screen.getAllByText('More evidence is needed.')).toHaveLength(2);
 });
 it('shows recoverable load errors',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load assessment');
  expect(screen.getByRole('button',{name:'Try again'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Assess this response'})).toBeDisabled();
 });
 it('cancels pending evaluation once and preserves terminal history',async()=>{
  let requests=0;
  vi.stubGlobal('fetch',vi.fn(async(_url:string,options:RequestInit)=>{
   if(options.method==='POST'){requests++;return new Response(JSON.stringify({...run,status:'CANCELLED'}));}
   return new Response(JSON.stringify({items:[{...run,status:'EVALUATING',completedAt:null}]}));
  }));
  render(<AssessmentPanel attemptId={run.submissionId}/>);
  const cancel=await screen.findByRole('button',{name:'Cancel evaluation'});
  expect(screen.getByRole('button',{name:'Re-evaluate'})).toBeDisabled();
  fireEvent.click(cancel);fireEvent.click(cancel);
  expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  expect(requests).toBe(1);
 });
});
