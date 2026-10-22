'use client';

import Link from 'next/link';
import { useT } from '../../i18n/provider';
import { adminExperienceMessages } from '../../i18n/messages/adminExperience';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react';

type ConfirmNavigation = () => boolean;
type NavigationGuard = {
  register: (confirmNavigation: ConfirmNavigation, message: string) => () => void;
  allowsNavigation: () => boolean;
};
const NavigationGuardContext = createContext<NavigationGuard | null>(null);

export function AdminNavigationGuardProvider({ children }: { children: ReactNode }) {
  const confirmations = useRef(new Map<ConfirmNavigation, string>());
  const guard = useMemo<NavigationGuard>(() => ({
    register(confirmNavigation, message) {
      confirmations.current.set(confirmNavigation, message);
      return () => { confirmations.current.delete(confirmNavigation); };
    },
    allowsNavigation: () => {
      const asked = new Set<string>();
      return [...confirmations.current].every(([confirmNavigation, message]) => {
        if (asked.has(message)) return true;
        asked.add(message); return confirmNavigation();
      });
    },
  }), []);
  return <NavigationGuardContext.Provider value={guard}>{children}</NavigationGuardContext.Provider>;
}

/** Isolated components remain usable; the admin layout supplies the shared registry. */
export function useAdminNavigationGuard(dirty: boolean, message: string) {
  const guard = useContext(NavigationGuardContext);
  // Update the registry in the same commit as the visible saved/dirty state.
  useLayoutEffect(() => {
    if (!dirty || !guard) return;
    return guard.register(() => window.confirm(message), message);
  }, [guard, dirty, message]);
}

/** Internal editor switches use the same registry as shell links. */
export function useAdminCanNavigate() {
  const context = useContext(NavigationGuardContext);
  return () => context?.allowsNavigation() ?? true;
}

/** Protect pending authoring work on shell links and full-page exits. */
export function useAdminDraftGuard(dirty: boolean, adminContextOnly = false) {
  const context = useContext(NavigationGuardContext);
  const enabled = dirty && (!adminContextOnly || context !== null);
  const t = useT('adminExperience', adminExperienceMessages);
  useAdminNavigationGuard(enabled, t('leave'));
  useEffect(() => {
    if (!enabled) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [enabled]);
  return () => !dirty || window.confirm(t('leave'));
}

export function AdminLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const guard = useContext(NavigationGuardContext);
  return <Link {...props} onNavigate={(event) => {
    let cancelled = false;
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (!cancelled && guard && !guard.allowsNavigation()) event.preventDefault();
  }} />;
}
