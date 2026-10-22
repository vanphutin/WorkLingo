import type { NavigationItem } from '../../components/workspace-navigation';

export type AdminGroupId = 'programs' | 'shared' | 'system';
export type AdminProgramId = 'intermediate' | 'ielts';
export interface AdminProgramNavigation {
  readonly id: AdminProgramId;
  readonly label: string;
  readonly items: readonly NavigationItem[];
}
export interface AdminNavigationGroup {
  readonly id: AdminGroupId;
  readonly label: string;
  readonly items: readonly NavigationItem[];
  readonly programs?: readonly AdminProgramNavigation[];
}

// These are existing catalog entries; proposed Foundation/Basic IA is separate.
export const adminProgramDestinations = [
  { slug: 'beginner', label: 'foundation' }, { slug: 'intermediate', label: 'intermediate' },
  { slug: 'toeic', label: 'toeic' }, { slug: 'ielts', label: 'ielts' },
] as const;
export function isAdminProgramDeferred(slug: string) {
  return slug === 'beginner' || slug === 'toeic';
}
export const adminIeltsDestinations = [
  { href: '/admin/ielts-orientation', label: 'ieltsOrientation' },
  { href: '/admin/ielts-bridge', label: 'ieltsBridge' },
  { href: '/admin/ielts-integrated', label: 'integrated' },
  { href: '/admin/ielts-mocks', label: 'mocks' },
  { href: '/admin/ielts-topics', label: 'ieltsTopics' },
  { href: '/admin/ielts-band-curriculum', label: 'bandCurriculum' },
] as const;

export const adminSharedDestinations = [
  { href: '/admin/content', label: 'content' }, { href: '/admin/curriculum', label: 'curriculum' },
  { href: '/admin/vocabulary', label: 'vocabularyLibrary' },
] as const;
export const adminSystemDestinations = [
  { href: '/admin/analytics', label: 'analytics' },
  { href: '/admin/audit', label: 'audit' }, { href: '/admin/operations', label: 'operations' },
  { href: '/admin/settings/audio', label: 'audioSettings' }, { href: '/admin/settings/ai', label: 'aiSettings' },
  { href: '/dashboard', label: 'learnerView' },
] as const;

export function findAdminDestination(pathname: string, items: readonly NavigationItem[]) {
  return items.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function adminRouteContext(pathname: string, groups: readonly AdminNavigationGroup[]) {
  const candidates = groups.flatMap(group => [
    ...group.items.map(item => ({ ...item, group: group.id, program: undefined })),
    ...(group.programs ?? []).flatMap(program => program.items.map(item => ({ ...item, group: group.id, program: program.id }))),
  ]);
  const active = findAdminDestination(pathname, candidates);
  return candidates.find(item => item.href === active?.href);
}
