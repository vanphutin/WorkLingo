'use client';
import React,{useState} from 'react';
import type {BeginnerTarget} from '@worklingo/contracts';
import {useT} from '../../i18n/provider';
import {adminBeginnerMessages} from '../../i18n/messages/adminBeginner';
import {beginnerAdminClient,type BeginnerPreviewData} from '../../lib/api/beginner-admin-client';
import {ActivityRenderer} from '../learning-session/activity-renderer';
export function BeginnerLearnerPreview({data,target,onClose}:{data:BeginnerPreviewData;target:BeginnerTarget;onClose:()=>void}){
 const t=useT('adminBeginner',adminBeginnerMessages);
 const [selected,setSelected]=useState(data.activities[0]?.id??''),[responses,setResponses]=useState<Record<string,unknown>>({});
 const activity=data.activities.find(a=>a.id===selected),audio=data.audio.find(a=>a.activityId===selected)?.artifactId;
 const url=audio?beginnerAdminClient.audioUrl(target,audio,data.kind==='PUBLISHED_PREVIEW'?data.lessonVersionId:undefined):undefined;
 return <section className="beginner-preview" aria-label={t('preview')}><header><h2>{t('preview')} · {data.title}</h2><button type="button" onClick={onClose}>{t('close')}</button></header><p>{t('localOnly')}</p>
  <p>{data.kind==='PUBLISHED_PREVIEW'?data.lessonVersionId:t('draftPreview')} · 45 min</p>
  <label>{t('activity')}<select value={selected} onChange={e=>setSelected(e.target.value)}>{data.activities.map(a=><option value={a.id} key={a.id}>{a.slug} · {a.activityType}</option>)}</select></label>
  {activity?<ActivityRenderer mode="admin-preview" activity={activity} value={responses[activity.id]} onChange={value=>setResponses(current=>({...current,[activity.id]:value}))} {...(url?{audioUrl:url}:{})}/>:null}
 </section>;
}
