'use client';

import { AdminLink as Link } from './admin-navigation-guard';
import { usePathname } from 'next/navigation';
import { useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';
import { isIntermediateCategory } from '@worklingo/content-format';
import { adminProgramAuthoringMessages } from '../../i18n/messages/adminProgramAuthoring';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import {
  adminIeltsDestinations, adminProgramDestinations, adminSharedDestinations, adminSystemDestinations,
} from './admin-navigation-model';
export { adminIeltsDestinations, adminProgramDestinations, isAdminProgramDeferred } from './admin-navigation-model';
export { AdminNavigation } from './admin-sidebar';

const sharedDestinations = [...adminSharedDestinations, ...adminSystemDestinations];
function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
}

export { useAdminNavigationGroups, useAdminNavigationItems } from './admin-navigation-config';

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const t = useT('adminDashboard', adminDashboardMessages);
  const tc = useT('common', commonMessages);
  const ta = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  const segments = pathname.split('/');
  if (pathname === '/admin/programs/intermediate/topic-groups') {
    return <nav className="ad-breadcrumbs" aria-label={t('breadcrumbs')}><ol>
      <li><Link href="/admin">{tc('admin')}</Link></li><li>{t('learningPrograms')}</li>
      <li><Link href="/admin/programs/intermediate">{t('intermediate')}</Link></li>
      <li><span aria-current="page">{tg('title')}</span></li>
    </ol></nav>;
  }
  if (pathname === '/admin/programs/intermediate/topics' || pathname.startsWith('/admin/programs/intermediate/topics/')) {
    return <nav className="ad-breadcrumbs" aria-label={t('breadcrumbs')}><ol>
      <li><Link href="/admin">{tc('admin')}</Link></li><li>{t('learningPrograms')}</li>
      <li><Link href="/admin/programs/intermediate">{t('intermediate')}</Link></li>
      <li><Link href="/admin/programs/intermediate/topic-groups">{tg('title')}</Link></li>
      {segments[5] ? <li><span aria-current="page">{segments[5] === 'new' ? tt('newTitle') : t('details')}</span></li> : null}
    </ol></nav>;
  }
  const category = segments[1] === 'admin' && segments[2] === 'programs' && segments[3] === 'intermediate'
    && isIntermediateCategory(segments[4] ?? '') ? segments[4] : null;
  if (category && isIntermediateCategory(category)) {
    const nested = Boolean(segments[5]);
    return <nav className="ad-breadcrumbs" aria-label={t('breadcrumbs')}><ol>
      <li><Link href="/admin">{tc('admin')}</Link></li>
      <li><span>{t('learningPrograms')}</span></li>
      <li><Link href="/admin/programs/intermediate">{t('intermediate')}</Link></li>
      <li>{nested ? <Link href={`/admin/programs/intermediate/${category}`}>{ta(category)}</Link> : <span aria-current="page">{ta(category)}</span>}</li>
      {nested ? <li><span aria-current="page">{segments[5] === 'new' ? ta('newLesson') : t('details')}</span></li> : null}
    </ol></nav>;
  }
  const program = adminProgramDestinations.find(({ slug }) => pathname === `/admin/programs/${slug}`);
  const destination = [...sharedDestinations, ...adminIeltsDestinations].find(({ href }) => isCurrent(pathname, href));
  const nested = destination && pathname !== destination.href;
  return <nav className="ad-breadcrumbs" aria-label={t('breadcrumbs')}><ol>
    <li>{pathname === '/admin' ? <span>{tc('admin')}</span> : <Link href="/admin">{tc('admin')}</Link>}</li>
    {program ? <><li><span>{t('learningPrograms')}</span></li><li><span aria-current="page">{t(program.label)}</span></li></>
      : destination ? <><li>{nested ? <Link href={destination.href}>{tc(destination.label)}</Link> : <span aria-current="page">{tc(destination.label)}</span>}</li>
        {nested ? <li><span aria-current="page">{pathname.endsWith('/new') ? t('newContent') : t('details')}</span></li> : null}</>
        : <li><span aria-current="page">{pathname === '/admin' ? t('overview') : t('details')}</span></li>}
  </ol></nav>;
}
