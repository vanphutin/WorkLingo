'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminProgramDto, CreateProgramInput } from '@worklingo/contracts';
import { LearningProgramClient } from '../../lib/api/learning-program-client';
import './admin-learning-programs.css';

const client = new LearningProgramClient();
const empty = { slug: '', name: '', description: '', learningGoal: '', proficiencyLabel: '', iconKey: 'intermediate' as const, displayOrder: 1 };
type Metadata = Omit<CreateProgramInput, 'idempotencyKey'>;
const fields = [{key:'name',label:'Name'},{key:'description',label:'Description'},{key:'learningGoal',label:'Learning goal'},{key:'proficiencyLabel',label:'Proficiency label'}] as const;
export function AdminLearningPrograms() {
  const [programs, setPrograms] = useState<AdminProgramDto[]>([]);
  const [form, setForm] = useState<Metadata>(empty);
  const [editing, setEditing] = useState<AdminProgramDto | null>(null);
  const [revisions, setRevisions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  // Reuse command keys only for unchanged payloads after uncertain network outcomes.
  const keys = useRef(new Map<string,string>());
  const commandKey = (payload: object) => { const key=JSON.stringify(payload); let id=keys.current.get(key); if(!id){id=crypto.randomUUID();keys.current.set(key,id);} return id; };
  useEffect(() => { let active=true; setLoading(true); void client.listPrograms().then(x=>{if(active)setPrograms(x.programs);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[reload]);
  function select(p: AdminProgramDto) { setEditing(p); setForm({slug:p.slug,name:p.name,description:p.description,learningGoal:p.learningGoal,proficiencyLabel:p.proficiencyLabel,iconKey:p.iconKey,displayOrder:p.displayOrder});setRevisions(p.curriculumRevisionIds.join('\n'));setError(null);setNotice(''); }
  async function run(action: 'save'|'publish'|'create') {
    if(busy)return;setBusy(true);setError(null);setNotice('');
    try {
      let p: AdminProgramDto;
      if(action==='create'){p=await client.createProgram({...form,idempotencyKey:commandKey({action,...form})});}
      else {
        if(!editing)return;
        if(action==='publish'){const payload={curriculumRevisionIds:revisions.trim().split(/\s+/).filter(Boolean),expectedRevision:editing.revision};p=await client.publishProgram(editing.id,{...payload,idempotencyKey:commandKey({id:editing.id,action,...payload})});}
        else {const {slug: _slug,...metadata}=form;const payload={...metadata,expectedRevision:editing.revision};p=await client.updateProgram(editing.id,{...payload,idempotencyKey:commandKey({id:editing.id,action,...payload})});}
      }
      setPrograms(x=>[...x.filter(a=>a.id!==p.id),p].sort((a,b)=>a.displayOrder-b.displayOrder));select(p);setNotice(action==='publish'?'Program published.':'Program saved.');
    } catch(e){setError(e instanceof Error?e.message:'Unable to save program.');}finally{setBusy(false);}
  }
  return <main className="admin-program-management">
    <header><h1>Learning programs</h1><p>Create a program, attach its curriculum, then publish the ordered learning path.</p></header>
    {error?<div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={()=>{setError(null);setReload(x=>x+1);}}>Reload program list</button></div>:null}
    {notice?<p role="status">{notice}</p>:null}
    <div className="admin-program-columns"><section className="admin-program-panel"><h2>{editing?'Edit program':'New program'}</h2>
      <form onSubmit={e=>{e.preventDefault();void run(editing?'save':'create');}} aria-busy={busy}>
        <fieldset disabled={busy}><label>Slug<input required value={form.slug} disabled={!!editing} onChange={e=>setForm({...form,slug:e.target.value})}/></label>
        {fields.map(({key,label})=><label key={key}>{label}{key==='description'?<textarea required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</label>)}
        <label>Display order<input type="number" min="1" max="100000" required value={form.displayOrder} onChange={e=>setForm({...form,displayOrder:Number(e.target.value)})}/></label>
        <label>Icon<select value={form.iconKey} onChange={e=>setForm({...form,iconKey:e.target.value as Metadata['iconKey']})}>{['beginner','intermediate','toeic','ielts'].map(icon=><option key={icon}>{icon}</option>)}</select></label>
        <button type="submit">{busy?'Saving…':editing?'Save changes':'Create program'}</button>
        {editing?<button type="button" onClick={()=>{setEditing(null);setForm(empty);setRevisions('');setError(null);setNotice('');}}>New program</button>:null}</fieldset>
      </form>
      {editing?<section><h2>Publish curriculum</h2><p>Program revision {editing.revision} · {editing.availabilityStatus}</p><label>Curriculum revision IDs<textarea aria-describedby="revision-help" disabled={busy} value={revisions} onChange={e=>setRevisions(e.target.value)}/></label><p id="revision-help">One published revision ID per line, in roadmap order. Existing enrollments retain their pinned curriculum.</p><button type="button" disabled={busy} onClick={()=>void run('publish')}>Publish program</button></section>:null}
    </section><section className="admin-program-panel"><h2>Program list</h2>{loading?<p role="status">Loading programs…</p>:programs.length===0?<p>No programs yet.</p>:<ul>{programs.map(p=><li key={p.id}><strong>{p.name}</strong><p>{p.availabilityStatus} · revision {p.revision}</p><button type="button" disabled={busy} onClick={()=>select(p)}>Edit {p.name}</button></li>)}</ul>}</section></div>
  </main>;
}
