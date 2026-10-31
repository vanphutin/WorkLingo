'use client';
import {useState} from 'react';
import type {ProgramPolicy} from '@worklingo/contracts';
import {useT} from '../../i18n/provider';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
export const defaultProgramPolicy:ProgramPolicy={version:1,sequential:{stages:true,units:true,lessons:true},completion:{requiredActivityRatio:1},mastery:{required:false,threshold:0.8,minimumQualifiedAttempts:1},retry:{maxAttempts:3,cooldownMinutes:0},remediation:{enabled:true,afterAttempts:2},review:{scheduleVersion:'program-review-v1',intervalsDays:[1,7,30],requiredForReadiness:false}};
export function PolicyEditor({value,onChange}:{value:ProgramPolicy;onChange:(value:ProgramPolicy)=>void}){
 const t=useT('programPlatform',programPlatformMessages);const [intervals,setIntervals]=useState(value.review.intervalsDays.join(', '));
 const check=(label:Parameters<typeof t>[0],checked:boolean,change:(value:boolean)=>void)=><label>{t(label)}<input type="checkbox" checked={checked} onChange={e=>change(e.target.checked)}/></label>;
 const number=(label:Parameters<typeof t>[0],v:number,min:number,max:number,step:number,change:(v:number)=>void)=><label>{t(label)}<input type="number" min={min} max={max} step={step} required value={v} onChange={e=>change(Number(e.target.value))}/></label>;
 return <details><summary>{t('policy')}</summary><p>{t('policyNote')}</p><div className="platform-form-grid">
 {(['stages','units','lessons'] as const).map(k=><div key={k}>{check(k==='lessons'?'sequentialLessons':k,value.sequential[k],v=>onChange({...value,sequential:{...value.sequential,[k]:v}}))}</div>)}
 {number('ratio',value.completion.requiredActivityRatio,0.01,1,0.01,v=>onChange({...value,completion:{requiredActivityRatio:v}}))}
 {check('masteryRequired',value.mastery.required,v=>onChange({...value,mastery:{...value.mastery,required:v}}))}
 {number('threshold',value.mastery.threshold,0,1,0.01,v=>onChange({...value,mastery:{...value.mastery,threshold:v}}))}
 {number('minimumAttempts',value.mastery.minimumQualifiedAttempts,1,100,1,v=>onChange({...value,mastery:{...value.mastery,minimumQualifiedAttempts:v}}))}
 {number('maxAttempts',value.retry.maxAttempts,1,100,1,v=>onChange({...value,retry:{...value.retry,maxAttempts:v}}))}
 {number('cooldown',value.retry.cooldownMinutes,0,525600,1,v=>onChange({...value,retry:{...value.retry,cooldownMinutes:v}}))}
 {check('remediation',value.remediation.enabled,v=>onChange({...value,remediation:{...value.remediation,enabled:v}}))}
 {number('afterAttempts',value.remediation.afterAttempts,1,100,1,v=>onChange({...value,remediation:{...value.remediation,afterAttempts:v}}))}
 <label>{t('intervals')}<input required value={intervals} onChange={e=>{setIntervals(e.target.value);onChange({...value,review:{...value.review,intervalsDays:e.target.value.split(',').map(Number)}});}}/></label>
 {check('reviewsRequired',value.review.requiredForReadiness,v=>onChange({...value,review:{...value.review,requiredForReadiness:v}}))}</div></details>;
}
