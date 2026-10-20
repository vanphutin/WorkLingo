'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { IeltsHistoryPageDto } from '@worklingo/contracts';
import { useLocalePreference, useT } from '../../i18n/provider';
import { localizedError } from '../../i18n/errors';
import { ieltsHubMessages } from '../../i18n/messages/ieltsHub';
import { ieltsFlowClient } from '../../lib/api/ielts-flow-client';
import '../ielts-hub/ielts-hub.css';
export function IeltsHistory() {
  const t=useT('ieltsHub',ieltsHubMessages);const {locale}=useLocalePreference();
  const [page,setPage]=useState<IeltsHistoryPageDto|null>(null);const [error,setError]=useState<unknown>(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;void ieltsFlowClient.history().then(value=>{if(active)setPage(value);}).catch(cause=>{if(active)setError(cause);});return()=>{active=false;};},[]);
  const more=async()=>{if(!page?.nextCursor)return;setBusy(true);setError(null);try{const next=await ieltsFlowClient.history(page.nextCursor);setPage(current=>({items:[...(current?.items??[]),...next.items.filter(item=>!current?.items.some(old=>old.kind===item.kind&&old.id===item.id))],nextCursor:next.nextCursor}));}catch(cause){setError(cause);}finally{setBusy(false);}};
  return <main className="ielts-hub-shell"><header className="ielts-hub-heading"><Link href="/ielts">{t('backIelts')}</Link><h1>{t('historyTitle')}</h1><p>{t('historyDescription')}</p></header>{error?<p role="alert">{localizedError(error,locale)}</p>:null}{!page&&!error?<p role="status">{t('loading')}</p>:null}{page&&!page.items.length?<p>{t('historyEmpty')}</p>:null}<ul className="ielts-history-list">{page?.items.map(item=><li key={`${item.kind}:${item.id}`}><Link href={item.href} lang="en">{item.title}</Link><p><span>{t(item.state)}</span><time dateTime={item.updatedAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.updatedAt))}</time></p></li>)}</ul>{page?.nextCursor?<button type="button" disabled={busy} onClick={()=>void more()}>{t('moreHistory')}</button>:null}</main>;
}
