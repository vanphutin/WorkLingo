'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {ProgramContextDto,ProgramEnrollmentListDto} from '@worklingo/contracts';
import {programPlatformClient as client} from '../../lib/api/program-platform-client';
import {learningProgramClient} from '../../lib/api/learning-program-client';
import {useT} from '../../i18n/provider';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
import {Paging,PlatformError} from './shared';
import {EnrolledProgramProgress} from './enrolled-program-progress';
import './program-platform.css';
export function EnrolledPrograms({initialContext}:{initialContext?:ProgramContextDto|null}){
 const t=useT('programPlatform',programPlatformMessages),router=useRouter();const pending=useRef(false);const [list,setList]=useState<ProgramEnrollmentListDto|null>(null),[context,setContext]=useState<ProgramContextDto|null>(null),[page,setPage]=useState(1),[reload,setReload]=useState(0),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
 useEffect(()=>{let active=true;void Promise.all([client.enrollmentsMine({page,limit:25}),initialContext!==undefined?Promise.resolve(initialContext):learningProgramClient.getContext()]).then(([l,c])=>{if(active){setList(l);setContext(c);}}).catch(e=>{if(active)setError(e);});return()=>{active=false;};},[page,reload,initialContext]);
 async function activate(slug:string){if(pending.current)return;if(slug==='ielts'){router.push('/ielts');return;}pending.current=true;setBusy(true);setError(null);try{const c=await learningProgramClient.activateProgram({programSlug:slug,expectedRevision:context?.enrollment?.revision??null});setContext(c);router.push('/dashboard');router.refresh();}catch(e){setError(e);}finally{pending.current=false;setBusy(false);}}
 return <section className="program-platform platform-panel"><h2>{t('myPrograms')}</h2><PlatformError error={error}/><button type="button" disabled={busy} onClick={()=>setReload(v=>v+1)}>{t('retry')}</button>{list?<><ul>{list.items.map(e=><li key={e.id}><h3>{e.display?.release?.title??e.display?.programName??(context?.activeProgram?.id===e.programId?context.activeProgram.name:e.programId)}</h3><p>{t(e.status)}</p><p>{t('pinned')}: {e.display?.release?t('version',{version:e.display.release.version}):t('legacy')}{e.display?.release?` · ${t(e.display.release.status)}`:''}</p>{e.display?.release?.description?<p>{e.display.release.description}</p>:null}<ul>{e.display?.release?.objectives?.map(o=><li key={o}>{o}</li>)}</ul>{e.status!=='ACTIVE'?<p>{t('readonly')}</p>:e.display?<button type="button" disabled={busy} onClick={()=>void activate(e.display!.programSlug)}>{t('resume')}</button>:null}{e.display?.release?.source==='AUTHORED'?<button type="button" onClick={()=>setSelected(e.id)}>{t('progress')}</button>:<Link href={e.display?.programSlug==='ielts'?'/ielts':'/dashboard'}>{t('legacy')}</Link>}</li>)}</ul><Paging page={page} total={list.total} onChange={setPage}/></>:!error?<p role="status">{t('loading')}</p>:null}{selected?<EnrolledProgramProgress key={selected} enrollmentId={selected} actionsEnabled={context?.enrollment?.id===selected}/>:null}</section>;
}
