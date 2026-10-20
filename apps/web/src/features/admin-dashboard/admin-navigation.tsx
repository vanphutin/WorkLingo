'use client';

import { AdminLink as Link } from './admin-navigation-guard';
import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';
import { intermediateCategories, isIntermediateCategory } from '@worklingo/content-format';
import { adminProgramAuthoringMessages } from '../../i18n/messages/adminProgramAuthoring';
import '../admin-intermediate/intermediate-navigation.css';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';

export const adminProgramDestinations = [
  { slug: 'beginner', label: 'foundation' }, { slug: 'intermediate', label: 'intermediate' },
  { slug: 'toeic', label: 'toeic' }, { slug: 'ielts', label: 'ielts' },
] as const;

export function isAdminProgramDeferred(slug: string) {
  return slug === 'beginner' || slug === 'toeic';
}

export const adminIeltsDestinations = [
  { href: '/admin/ielts-topics', label: 'ieltsTopics' },
  { href: '/admin/ielts-orientation', label: 'ieltsOrientation' },
  { href: '/admin/ielts-bridge', label: 'ieltsBridge' },
  { href: '/admin/ielts-integrated', label: 'integrated' },
  { href: '/admin/ielts-mocks', label: 'mocks' },
  { href: '/admin/ielts-band-curriculum', label: 'bandCurriculum' },
] as const;

const sharedDestinations = [
  { href: '/admin/content', label: 'content' }, { href: '/admin/curriculum', label: 'curriculum' },
  { href: '/admin/settings/audio', label: 'audioSettings' }, { href: '/admin/analytics', label: 'analytics' },
  { href: '/admin/audit', label: 'audit' }, { href: '/admin/operations', label: 'operations' },
  { href: '/admin/settings/ai', label: 'aiSettings' }, { href: '/dashboard', label: 'learnerView' },
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
}

export function AdminNavigation() {
  const pathname = usePathname();
  const t = useT('adminDashboard', adminDashboardMessages);
  const tc = useT('common', commonMessages);
  const ta = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  return (
    <aside className="ad-sidebar">
      <details className="ad-navigation" open>
        <summary>{t('navigation')}</summary>
        <nav aria-label={tc('adminWorkspace')}>
          <Link className="ad-nav-link" href="/admin" aria-current={pathname === '/admin' ? 'page' : undefined}>{t('overview')}</Link>
          <section aria-labelledby="admin-program-navigation">
            <h2 id="admin-program-navigation">{t('learningPrograms')}</h2>
            {adminProgramDestinations.map(({ slug, label }) => isAdminProgramDeferred(slug)
              ? <div className="ad-nav-unavailable" key={slug}><span>{t(label)}</span><small>{t('deferred')}</small></div>
              : <Fragment key={slug}>
                <Link className="ad-nav-link" href={`/admin/programs/${slug}`}
                  aria-current={(slug === 'intermediate' ? pathname === '/admin/programs/intermediate' : isCurrent(pathname, `/admin/programs/${slug}`)) ? 'page' : undefined}>{t(label)}</Link>
                {slug === 'intermediate' ? <details className="intermediate-program-navigation" open={isCurrent(pathname, '/admin/programs/intermediate')}>
                  <summary>{tt('tools')}</summary>
                  <Link className="ad-nav-link" href="/admin/programs/intermediate/topic-groups"
                    aria-current={pathname === '/admin/programs/intermediate/topic-groups' || isCurrent(pathname, '/admin/programs/intermediate/topics') ? 'page' : undefined}>{tg('title')}</Link>
                  <details className="intermediate-category-navigation" open={isIntermediateCategory(pathname.split('/')[4] ?? '')}>
                    <summary>{tt('legacy')}</summary>
                    {intermediateCategories.map((category) => <Link className="ad-nav-link" key={category}
                      href={`/admin/programs/intermediate/${category}`}
                      aria-current={isCurrent(pathname, `/admin/programs/intermediate/${category}`) ? 'page' : undefined}>{ta(category)}</Link>)}
                  </details>
                </details> : null}
              </Fragment>)}
            <details className="ad-ielts-navigation" open={pathname.includes('/ielts-') || pathname === '/admin/programs/ielts'}>
              <summary>{t('ieltsTools')}</summary>
              {adminIeltsDestinations.map(({ href, label }) => <Link className="ad-nav-link" key={href} href={href}
                aria-current={isCurrent(pathname, href) ? 'page' : undefined}>{tc(label)}</Link>)}
            </details>
          </section>
          <section aria-labelledby="admin-shared-navigation">
            <h2 id="admin-shared-navigation">{t('sharedManagement')}</h2>
            {sharedDestinations.map(({ href, label }) => <Link className="ad-nav-link" key={href} href={href}
              aria-current={isCurrent(pathname, href) ? 'page' : undefined}>{tc(label)}</Link>)}
            <div className="ad-nav-unavailable"><span>{t('users')}</span><small>{t('disabled')}</small></div>
          </section>
        </nav>
      </details>
    </aside>
  );
}

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
