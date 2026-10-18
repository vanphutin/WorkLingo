'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';

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
              : <Link className="ad-nav-link" key={slug} href={`/admin/programs/${slug}`}
                aria-current={isCurrent(pathname, `/admin/programs/${slug}`) ? 'page' : undefined}>{t(label)}</Link>)}
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
