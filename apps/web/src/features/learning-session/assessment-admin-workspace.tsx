'use client';
import { useId,useState } from 'react';
import { z } from 'zod';
import { useT } from '../../i18n/provider';
import { assessmentMessages } from '../../i18n/messages/assessment';
import { AssessmentPanel } from './assessment-panel';
import styles from './assessment-panel.module.css';
export function AssessmentAdminWorkspace(){
 const t=useT('assessment',assessmentMessages),id=useId();
 const [value,setValue]=useState(''),[attempt,setAttempt]=useState(''),[invalid,setInvalid]=useState(false);
 return <main className={styles.panel}><h1>{t('adminTitle')}</h1><form onSubmit={event=>{event.preventDefault();const parsed=z.uuid().safeParse(value.trim());setInvalid(!parsed.success);if(parsed.success)setAttempt(parsed.data);}}>
  <label htmlFor={id}>{t('attempt')}</label><input id={id} value={value} onChange={event=>setValue(event.target.value)} aria-invalid={invalid} aria-describedby={invalid?`${id}-error`:undefined}/><button type="submit">{t('open')}</button>
  {invalid?<p role="alert" id={`${id}-error`}>{t('invalid')}</p>:null}
 </form>{attempt?<AssessmentPanel key={attempt} attemptId={attempt} admin/>:null}</main>;
}
