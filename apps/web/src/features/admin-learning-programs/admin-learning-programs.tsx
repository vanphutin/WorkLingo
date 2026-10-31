'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminProgramDto, CreateProgramInput } from '@worklingo/contracts';
import { LearningProgramClient } from '../../lib/api/learning-program-client';
import './admin-learning-programs.css';
import {useAdminCanNavigate} from '../admin-dashboard/admin-navigation-guard';
import {useT,useLocalePreference} from '../../i18n/provider';
import {localizedError} from '../../i18n/errors';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
import {ReleasePanel} from '../program-platform/release-panel';
import {EnrollmentPanel} from '../program-platform/enrollment-panel';
import {AnalyticsPanel} from '../program-platform/analytics-panel';
import '../program-platform/program-platform.css';

const client = new LearningProgramClient();
const empty = { slug: '', name: '', description: '', learningGoal: '', proficiencyLabel: '', iconKey: 'intermediate' as const, displayOrder: 1 };
type Metadata = Omit<CreateProgramInput, 'idempotencyKey'>;
const fields = [{key:'name',label:'Name'},{key:'description',label:'Description'},{key:'learningGoal',label:'Learning goal'},{key:'proficiencyLabel',label:'Proficiency label'}] as const;
export function AdminLearningPrograms({initialProgramId}:{initialProgramId?:string}={}) {
  const canNavigate=useAdminCanNavigate();const initialSelected=useRef(false);
  const t=useT('programPlatform',programPlatformMessages);const {locale}=useLocalePreference();
  const [panel,setPanel]=useState<'releases'|'enrollments'|'analytics'>('releases');
  const [programs, setPrograms] = useState<AdminProgramDto[]>([]);
  const [form, setForm] = useState<Metadata>(empty);
  const [editing, setEditing] = useState<AdminProgramDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  // Reuse command keys only for unchanged payloads after uncertain network outcomes.
  const keys = useRef(new Map<string,string>());
  const commandKey = (payload: object) => { const key=JSON.stringify(payload); let id=keys.current.get(key); if(!id){id=crypto.randomUUID();keys.current.set(key,id);} return id; };
  useEffect(() => { let active=true; setLoading(true); void client.listPrograms().then(x=>{if(active){setPrograms(x.programs);setEditing(current=>current?x.programs.find(p=>p.id===current.id)??current:null);if(initialProgramId&&!initialSelected.current){const target=x.programs.find(p=>p.id===initialProgramId);if(target){select(target);initialSelected.current=true;}}}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[reload,initialProgramId]);
  function select(p: AdminProgramDto) { setEditing(p); setForm({slug:p.slug,name:p.name,description:p.description,learningGoal:p.learningGoal,proficiencyLabel:p.proficiencyLabel,iconKey:p.iconKey,displayOrder:p.displayOrder});setError(null);setNotice(''); }
  async function run(action: 'save'|'create') {
    if(busy)return;setBusy(true);setError(null);setNotice('');
    try {
      let p: AdminProgramDto;
      if(action==='create'){p=await client.createProgram({...form,idempotencyKey:commandKey({action,...form})});}
      else {
        if(!editing)return;
        const {slug: _slug,...metadata}=form;const payload={...metadata,expectedRevision:editing.revision};p=await client.updateProgram(editing.id,{...payload,idempotencyKey:commandKey({id:editing.id,action,...payload})});
      }
      setPrograms(x=>[...x.filter(a=>a.id!==p.id),p].sort((a,b)=>a.displayOrder-b.displayOrder));select(p);setNotice(t('savedProgram'));
    } catch(e){setError(localizedError(e,locale));}finally{setBusy(false);}
  }
  return <main className="admin-program-management">
    <header><h1>{t('programs')}</h1><p>{t('intro')}</p></header>
    {error?<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>{setError(null);setReload(x=>x+1);}}>{t('retry')}</button></div>:null}
    {notice?<p role="status">{notice}</p>:null}
    <div className="admin-program-columns"><section className="admin-program-panel"><h2>{editing?t('metadata'):t('newProgram')}</h2>
      <form onSubmit={e=>{e.preventDefault();void run(editing?'save':'create');}} aria-busy={busy}>
        <fieldset disabled={busy}><label>{t('slug')}<input required value={form.slug} disabled={!!editing} onChange={e=>setForm({...form,slug:e.target.value})}/></label>
        {fields.map(({key})=><label key={key}>{t(key)}{key==='description'?<textarea required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}
        <label>{t('displayOrder')}<input type="number" min="1" max="100000" required value={form.displayOrder} onChange={e=>setForm({...form,displayOrder:Number(e.target.value)})}/></label>
        <label>{t('icon')}<select value={form.iconKey} onChange={e=>setForm({...form,iconKey:e.target.value as Metadata['iconKey']})}>{['beginner','intermediate','toeic','ielts'].map(icon=><option key={icon}>{icon}</option>)}</select></label>
        <button type="submit">{busy?t('loading'):editing?t('saveChanges'):t('createProgram')}</button>
        {editing?<button type="button" onClick={()=>{setEditing(null);setForm(empty);setError(null);setNotice('');}}>{t('newProgram')}</button>:null}</fieldset>
      </form>

    </section><section className="admin-program-panel"><h2>{t('programList')}</h2>{loading?<p role="status">{t('loading')}</p>:programs.length===0?<p>{t('empty')}</p>:<ul>{programs.map(p=><li key={p.id}><strong>{p.name}</strong><p>{p.availabilityStatus} · revision {p.revision}</p><button type="button" disabled={busy} onClick={()=>{if(canNavigate())select(p);}}>{t('edit',{name:p.name})}</button></li>)}</ul>}</section></div>
    {editing?<section className="program-platform"><nav aria-label={editing.name}>{(['releases','enrollments','analytics'] as const).map(p=><button type="button" aria-pressed={panel===p} key={p} onClick={()=>{if(canNavigate())setPanel(p);}}>{t(p)}</button>)}</nav>{panel==='releases'?<ReleasePanel key={editing.id} program={editing} onProgramChange={next=>{if(next)setPrograms(items=>[...items.filter(p=>p.id!==next.id),next]);setReload(v=>v+1);}}/>:panel==='enrollments'?<EnrollmentPanel programId={editing.id} revision={editing.revision}/>:<AnalyticsPanel programId={editing.id}/>}</section>:null}
  </main>;
}
