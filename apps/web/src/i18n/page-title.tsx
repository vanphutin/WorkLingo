'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from './provider';
import { metadataMessages } from './messages/metadata';

const routes = [
  ['/onboarding/placement/', 'placement'], ['/sessions/', 'session'], ['/admin/content', 'content'],
  ['/admin/ielts-band-curriculum', 'band'], ['/admin/curriculum', 'curriculum'], ['/admin/audit', 'audit'], ['/admin/operations', 'operations'], ['/admin/analytics', 'analytics'],
  ['/admin/ielts-orientation', 'orientation'], ['/admin/ielts-bridge', 'bridge'], ['/admin/ielts-integrated', 'practice'], ['/admin/ielts-mocks', 'mocks'],
  ['/admin/settings/audio', 'audio'], ['/settings/audio', 'audio'], ['/settings', 'settings'],
  ['/ielts/orientation', 'orientation'], ['/ielts/bridge', 'bridge'], ['/ielts/practice', 'practice'], ['/ielts/mock-tests', 'mocks'], ['/ielts/pathway', 'pathway'],
  ['/login', 'login'], ['/register', 'register'], ['/dashboard', 'dashboard'], ['/programs', 'programs'], ['/mastery', 'mastery'], ['/onboarding', 'onboarding'],
] as const;

/** Update browser metadata during state-preserving client switches, without a route refresh. */
export function LocalizedPageTitle() {
  const pathname = usePathname();
  const t = useT('metadata', metadataMessages);
  useEffect(() => {
    const route = routes.find(([prefix]) => pathname?.startsWith(prefix));
    document.title = route ? `${t(route[1])} | WorkLingo` : 'WorkLingo';
  }, [pathname, t]);
  return null;
}
