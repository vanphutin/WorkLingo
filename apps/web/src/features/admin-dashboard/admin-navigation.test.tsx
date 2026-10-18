import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminBreadcrumbs, AdminNavigation } from './admin-navigation';

const location = vi.hoisted(() => ({ pathname: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));
afterEach(() => { cleanup(); location.pathname = '/admin'; });

describe('Admin workspace navigation', () => {
  it('exposes contextual IELTS topic authoring with a matching breadcrumb', () => {
    location.pathname = '/admin/ielts-topics';
    render(<><AdminNavigation /><AdminBreadcrumbs /></>);
    expect(screen.getByRole('link', { name: 'IELTS topics' })).toHaveAttribute('href', '/admin/ielts-topics');
    expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).toHaveTextContent('IELTS topics');
  });
  it('retains every pre-existing management destination in the grouped navigation', () => {
    render(<AdminNavigation />);
    const nav = screen.getByRole('navigation', { name: 'Admin workspace' });
    const hrefs = within(nav).getAllByRole('link', { hidden: true }).map((link) => link.getAttribute('href'));
    for (const href of ['/admin/content', '/admin/curriculum', '/admin/ielts-orientation', '/admin/ielts-bridge', '/admin/ielts-integrated', '/admin/ielts-mocks', '/admin/ielts-band-curriculum', '/admin/audit', '/admin/operations', '/admin/analytics', '/admin/settings/audio', '/admin/settings/ai', '/dashboard']) {
      expect(hrefs).toContain(href);
    }
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByText('IELTS tools'));
    expect(within(nav).getByRole('link', { name: 'IELTS orientation' })).toBeVisible();
  });

  it('marks the current program and shows a clear program breadcrumb', () => {
    location.pathname = '/admin/programs/intermediate';
    render(<><AdminNavigation /><AdminBreadcrumbs /></>);
    expect(screen.getByRole('link', { name: 'Intermediate' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(breadcrumbs).toHaveTextContent('AdminLearning ProgramsIntermediate');
    expect(within(breadcrumbs).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('defers Foundation and TOEIC while retaining Intermediate and IELTS authoring', () => {
    render(<AdminNavigation />);
    expect(screen.queryByRole('link', { name: 'Foundation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TOEIC' })).not.toBeInTheDocument();
    expect(screen.getByText('Foundation').closest('.ad-nav-unavailable')).toHaveTextContent('Planned for later');
    expect(screen.getByText('TOEIC').closest('.ad-nav-unavailable')).toHaveTextContent('Planned for later');
    expect(screen.getByRole('link', { name: 'Intermediate' })).toHaveAttribute('href', '/admin/programs/intermediate');
    expect(screen.getByRole('link', { name: 'IELTS' })).toHaveAttribute('href', '/admin/programs/ielts');
  });

  it('keeps content authoring hierarchy without exposing an opaque record id', () => {
    location.pathname = '/admin/content/11111111-1111-4111-8111-111111111111';
    render(<><AdminNavigation /><AdminBreadcrumbs /></>);
    const nav = screen.getByRole('navigation', { name: 'Admin workspace' });
    expect(within(nav).getByRole('link', { name: 'Content' })).toHaveAttribute('aria-current', 'page');
    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(within(breadcrumbs).getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/admin/content');
    expect(breadcrumbs).toHaveTextContent('Details');
    expect(breadcrumbs).not.toHaveTextContent('11111111');
  });
});
