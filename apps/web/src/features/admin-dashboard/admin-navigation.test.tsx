import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminBreadcrumbs } from './admin-navigation';
const location = vi.hoisted(() => ({ pathname: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));
afterEach(() => { cleanup(); location.pathname = '/admin'; });
describe('Admin breadcrumbs', () => {
  it.each([['', 'Grammar'], ['/new', 'New lesson'], ['/opaque-id', 'Details']])('shows valid category hierarchy for %s', (suffix, current) => {
    location.pathname = `/admin/programs/intermediate/grammar${suffix}`;
    render(<AdminBreadcrumbs />);
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(crumbs).toHaveTextContent('AdminLearning ProgramsIntermediateGrammar');
    expect(within(crumbs).getByRole('link', { name: 'Intermediate' })).toHaveAttribute('href', '/admin/programs/intermediate');
    expect(crumbs.querySelector('[aria-current="page"]')).toHaveTextContent(current);
    if (suffix) expect(within(crumbs).getByRole('link', { name: 'Grammar' })).toHaveAttribute('href', '/admin/programs/intermediate/grammar');
    expect(crumbs).not.toHaveTextContent('opaque-id');
  });

  it('includes the IELTS parent for standalone tools', () => {
    location.pathname = '/admin/ielts-orientation'; render(<AdminBreadcrumbs />);
    expect(screen.getByRole('link', { name: 'IELTS' })).toHaveAttribute('href', '/admin/programs/ielts');
  });

  it('does not invent a category breadcrumb for invalid slugs', () => {
    location.pathname = '/admin/programs/intermediate/not-a-category/new';
    render(<AdminBreadcrumbs />);
    expect(screen.queryByRole('link', { name: 'Grammar' })).not.toBeInTheDocument();
  });
  it('keeps content authoring hierarchy without exposing an opaque record id', () => {
    location.pathname = '/admin/content/11111111-1111-4111-8111-111111111111';
    render(<AdminBreadcrumbs />);
    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(within(breadcrumbs).getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/admin/content');
    expect(breadcrumbs).toHaveTextContent('Details');
    expect(breadcrumbs).not.toHaveTextContent('11111111');
  });
});
