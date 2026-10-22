'use client';

import { useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';
import { intermediateCategories } from '@worklingo/content-format';
import { adminProgramAuthoringMessages } from '../../i18n/messages/adminProgramAuthoring';
import { intermediateTopicsMessages } from '../../i18n/messages/intermediateTopics';
import { intermediateGroupsMessages } from '../../i18n/messages/intermediateGroups';
import { adminNavigationMessages } from '../../i18n/messages/adminNavigation';
import {
  adminIeltsDestinations, adminSharedDestinations, adminSystemDestinations,
  type AdminNavigationGroup,
} from './admin-navigation-model';

/** One localized configuration feeds the sidebar and shell context. */
export function useAdminNavigationGroups(): readonly AdminNavigationGroup[] {
  const t = useT('adminNavigation', adminNavigationMessages);
  const tc = useT('common', commonMessages);
  const ta = useT('adminProgramAuthoring', adminProgramAuthoringMessages);
  const tt = useT('intermediateTopics', intermediateTopicsMessages);
  const tg = useT('intermediateGroups', intermediateGroupsMessages);
  return [
    { id: 'programs', label: t('programs'), items: [], programs: [
      { id: 'intermediate', label: t('intermediate'), items: [
        { href: '/admin/programs/intermediate', label: t('programOverview') },
        { href: '/admin/programs/intermediate/topic-groups', label: tg('title') },
        { href: '/admin/programs/intermediate/topics', label: tt('title') },
        ...intermediateCategories.map(category => ({ href: `/admin/programs/intermediate/${category}`, label: ta(category) })),
      ] },
      { id: 'ielts', label: t('ielts'), items: [
        { href: '/admin/programs/ielts', label: t('programOverview') },
        ...adminIeltsDestinations.map(({ href, label }) => ({ href, label: tc(label) })),
      ] },
    ] },
    { id: 'shared', label: t('shared'), items: [
      { href: '/admin/content', label: tc('content') },
      { href: '/admin/content/new', label: t('importContent') },
      ...adminSharedDestinations.filter(item => item.href !== '/admin/content').map(({ href, label }) => ({ href, label: tc(label) })),
    ] },
    { id: 'system', label: t('system'), items: adminSystemDestinations.map(({ href, label }) => ({ href, label: tc(label) })) },
  ];
}

export function useAdminNavigationItems() {
  const t = useT('adminDashboard', adminDashboardMessages);
  const groups = useAdminNavigationGroups();
  return [{ href: '/admin', label: t('overview') }, ...groups.flatMap(group => [
    ...group.items, ...(group.programs ?? []).flatMap(program => program.items),
  ])];
}
