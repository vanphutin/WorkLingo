'use client';
import {useRef} from 'react';
import {useLocalePreference,useT} from '../../i18n/provider';
import {localizedError} from '../../i18n/errors';
import {programPlatformMessages} from '../../i18n/messages/programPlatform';
export function useCommandKey(){
 const keys=useRef(new Map<string,string>());
 const keyFor=(scope:string,payload:object)=>{const fingerprint=JSON.stringify([scope,payload]);let key=keys.current.get(fingerprint);if(!key){key=crypto.randomUUID();keys.current.set(fingerprint,key);}return key;};
 // An acknowledged command or explicit discard ends the retry intent.
 return Object.assign(keyFor,{reset:()=>keys.current.clear()});
}
export function PlatformError({error}:{error:unknown}){const t=useT('programPlatform',programPlatformMessages);const {locale}=useLocalePreference();return error?<div className="status-card error-card" role="alert" tabIndex={-1}><p>{t('error')}</p><p>{localizedError(error,locale)}</p></div>:null;}
export function Paging({page,total,limit=25,onChange,disabled=false}:{page:number;total:number;limit?:number;onChange:(page:number)=>void;disabled?:boolean}){const t=useT('programPlatform',programPlatformMessages);return <nav aria-label={t('page',{page,total})}><span>{t('page',{page,total})}</span><button disabled={disabled||page<=1} onClick={()=>onChange(page-1)} type="button">{t('previous')}</button><button disabled={disabled||page*limit>=total} onClick={()=>onChange(page+1)} type="button">{t('next')}</button></nav>;}

export function useProgramReason(){const t=useT('programPlatform',programPlatformMessages);return (reason:string)=>{const code=reason.split(':')[0]!;return code in programPlatformMessages.en?t(code as keyof typeof programPlatformMessages.en):t('unknownReason');};}

export function useProgramFormat(){
 const {locale}=useLocalePreference();
 const number=new Intl.NumberFormat(locale);
 const percent=new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1});
 const date=new Intl.DateTimeFormat(locale,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
 return {number:(value:number)=>number.format(value),percent:(value:number)=>percent.format(value),date:(value:string)=>`${date.format(new Date(value))} UTC`};
}
