'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from 'react';

type ConfirmNavigation = () => boolean;
type NavigationGuard = {
  register: (confirmNavigation: ConfirmNavigation) => () => void;
  allowsNavigation: () => boolean;
};
const NavigationGuardContext = createContext<NavigationGuard | null>(null);

export function AdminNavigationGuardProvider({ children }: { children: ReactNode }) {
  const confirmations = useRef(new Set<ConfirmNavigation>());
  const guard = useMemo<NavigationGuard>(() => ({
    register(confirmNavigation) {
      confirmations.current.add(confirmNavigation);
      return () => { confirmations.current.delete(confirmNavigation); };
    },
    allowsNavigation: () => [...confirmations.current].every((confirmNavigation) => confirmNavigation()),
  }), []);
  return <NavigationGuardContext.Provider value={guard}>{children}</NavigationGuardContext.Provider>;
}

/** Isolated components remain usable; the admin layout supplies the shared registry. */
export function useAdminNavigationGuard(dirty: boolean, message: string) {
  const guard = useContext(NavigationGuardContext);
  useEffect(() => {
    if (!dirty || !guard) return;
    return guard.register(() => window.confirm(message));
  }, [guard, dirty, message]);
}

export function AdminLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const guard = useContext(NavigationGuardContext);
  return <Link {...props} onNavigate={(event) => {
    let cancelled = false;
    onNavigate?.({ preventDefault: () => { cancelled = true; event.preventDefault(); } });
    if (!cancelled && guard && !guard.allowsNavigation()) event.preventDefault();
  }} />;
}
