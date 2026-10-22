import type { ReactNode, HTMLAttributes } from 'react';

/** Presentation only. Feature owners retain loading, forms, mutation and selection state. */
export function AdminPageHeader({ title, description, actions, children, titleId }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; titleId?: string }) {
  return <header className="admin-page-header"><div className="admin-page-heading"><h1 id={titleId}>{title}</h1>{description ? <p>{description}</p> : null}{children}</div>{actions ? <div className="admin-toolbar">{actions}</div> : null}</header>;
}
export function AdminSectionHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return <div className="admin-context-section"><h2>{title}</h2>{children}</div>;
}
export function AdminToolbar({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`admin-toolbar ${className}`}>{children}</div>; }
export function AdminStatusBadge({ children }: { children: ReactNode }) { return <span className="admin-context-status">{children}</span>; }
export function AdminEmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) { return <div className="admin-empty-state"><h2>{title}</h2>{children}</div>; }
export function AdminErrorState({ children }: { children: ReactNode }) { return <div className="admin-error-state" role="alert">{children}</div>; }
export function AdminFilterBar({ label, children }: { label: string; children: ReactNode }) { return <div className="admin-filter-bar" role="group" aria-label={label}>{children}</div>; }
export function AdminDataTable({ label, children }: { label: string; children: ReactNode }) { return <div className="admin-data-table" role="region" aria-label={label} tabIndex={0}>{children}</div>; }
export function AdminWorkspaceLayout({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`admin-workspace-layout ${className}`}>{children}</div>; }
