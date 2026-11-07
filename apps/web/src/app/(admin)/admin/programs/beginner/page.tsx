'use client';
import {BeginnerWorkspace} from '../../../../../features/admin-beginner/beginner-workspace';
import Link from 'next/link';
import {useT} from '../../../../../i18n/provider';
import {programPlatformMessages} from '../../../../../i18n/messages/programPlatform';
export default function BeginnerPage(){
 const t=useT('programPlatform',programPlatformMessages);
 return <><Link href="/admin/learning-programs">{t('releases')}</Link><BeginnerWorkspace/></>;
}
