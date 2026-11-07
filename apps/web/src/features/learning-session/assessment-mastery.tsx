'use client';
import {useEffect,useState} from 'react';
import {assessmentClient,type AssessmentMasteryResult} from '../../lib/api/assessment-client';
import {useT} from '../../i18n/provider';
import {assessmentMessages} from '../../i18n/messages/assessment';
import styles from './assessment-panel.module.css';
export function AssessmentMastery(){
 const t=useT('assessment',assessmentMessages);
 const [data,setData]=useState<AssessmentMasteryResult|null>(null),[error,setError]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{let active=true;setError(false);assessmentClient.mastery().then(value=>{if(active)setData(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[reload]);
 return <section className={styles.panel} aria-label={t('mastery')}><h2>{t('mastery')}</h2>
  {error?<p role="alert">{t('error')} <button onClick={()=>setReload(n=>n+1)}>{t('retry')}</button></p>:!data?<p role="status">{t('loading')}</p>:null}
  {data?<><p>{data.disclosure}</p><div className={styles.criteria}>{data.skills.map(skill=><article key={skill.skill} className={styles.criterion}><h3>{t(skill.skill)}</h3><strong>{skill.score===null?t('notScored'):`${skill.score} / 100`}</strong><p>{t('observations',{count:skill.observations})}</p><p>{t('confidence',{value:t(skill.confidence)})}</p><ul>{skill.gaps.map((gap,i)=><li key={i}>{gap}</li>)}</ul><p>{skill.recommendation}</p></article>)}</div></>:null}
 </section>;
}
