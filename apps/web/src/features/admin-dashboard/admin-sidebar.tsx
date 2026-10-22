'use client';

import { useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WorkspaceNavigation } from '../../components/workspace-navigation';
import { useT } from '../../i18n/provider';
import { commonMessages } from '../../i18n/messages/common';
import { adminNavigationMessages } from '../../i18n/messages/adminNavigation';
import { adminDashboardMessages } from '../../i18n/messages/adminDashboard';
import { useAdminNavigationGroups } from './admin-navigation-config';
import { AdminLink } from './admin-navigation-guard';
import { adminRouteContext, type AdminGroupId, type AdminProgramId } from './admin-navigation-model';
import './admin-sidebar.css';

export function AdminNavigation() {
  const pathname = usePathname();
  const groups = useAdminNavigationGroups();
  const active = adminRouteContext(pathname, groups);
  const t = useT('adminNavigation', adminNavigationMessages);
  const tc = useT('common', commonMessages);
  const td = useT('adminDashboard', adminDashboardMessages);
  const id = useId();
  const triggers = useRef<Partial<Record<AdminGroupId, HTMLButtonElement | null>>>({});
  const [choice, setChoice] = useState<{ pathname: string; group: AdminGroupId | null; program: AdminProgramId }>({
    pathname, group: active?.group ?? null, program: active?.program ?? 'intermediate',
  });
  // A path transition (including back/forward) resets only navigation context.
  // No effect, storage, router call or key can remount the sibling editor.
  if (choice.pathname !== pathname) {
    setChoice({ pathname, group: active?.group ?? null, program: active?.program ?? 'intermediate' });
  }
  const items = [{ href: '/admin', label: td('overview') }, ...groups.flatMap(group => [
    ...group.items, ...(group.programs ?? []).flatMap(program => program.items),
  ])];
  const selected = (href: string) => (active?.href ?? (pathname === '/admin' ? '/admin' : undefined)) === href;
  const link = ({ href, label }: { href: string; label: string }) => <AdminLink key={href}
    className="workspace-nav-link" href={href} aria-current={selected(href) ? 'page' : undefined}><span>{label}</span></AdminLink>;

  return <WorkspaceNavigation items={items} label={tc('adminWorkspace')} variant="admin" linkComponent={AdminLink}>
    <div className="admin-sidebar-groups" onKeyDown={event => {
      if (event.key === 'Escape' && choice.group) {
        event.preventDefault(); event.stopPropagation();
        triggers.current[choice.group]?.focus();
        setChoice({ ...choice, group: null });
      }
    }}>
      {link(items[0]!)}
      {groups.map(group => <div className="admin-sidebar-group" key={group.id}>
        <button className="admin-sidebar-trigger" type="button" ref={node => { triggers.current[group.id] = node; }}
          aria-expanded={choice.group === group.id} aria-controls={`${id}-${group.id}`}
          onClick={() => setChoice({ ...choice, group: choice.group === group.id ? null : group.id })}>
          <span>{group.label}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
        <div id={`${id}-${group.id}`} className="admin-sidebar-panel" hidden={choice.group !== group.id}>
          {group.programs ? <>
            <div className="admin-program-picker" role="group" aria-label={t('chooseProgram')}>
              {(['foundation', 'basic', 'intermediate', 'toeic', 'ielts'] as const).map(program => {
                const available = group.programs?.find(item => item.id === program);
                return available ? <button type="button" key={program} className="admin-program-choice"
                  aria-pressed={choice.program === program} aria-controls={`${id}-tools-${program}`}
                  onClick={() => setChoice({ ...choice, program: available.id })}>{available.label}</button>
                  : <div className="admin-program-proposed" key={program}><span>{t(program)}</span><small>{t('proposed')}</small></div>;
              })}
            </div>
            <p className="admin-sidebar-note">{t('proposedHelp')}</p>
            {group.programs.map(program => <div id={`${id}-tools-${program.id}`} hidden={choice.program !== program.id} key={program.id}>
              <p className="workspace-nav-group-label">{program.label}</p>
              {program.items.map(link)}
            </div>)}
          </> : group.items.map(link)}
        </div>
      </div>)}
    </div>
  </WorkspaceNavigation>;
}
