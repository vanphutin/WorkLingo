import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminBreadcrumbs, AdminNavigation } from './admin-navigation';

const location = vi.hoisted(() => ({ pathname: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));
afterEach(() => { cleanup(); location.pathname = '/admin'; });

describe('Admin workspace navigation', () => {
  it('places category navigation immediately after Intermediate and before TOEIC and IELTS', () => {
    render(<AdminNavigation />);
    const intermediate = screen.getByRole('link', { name: 'Intermediate' });
    const categories = screen.getByText('Earlier category tools').closest('details')!;
    const toeic = screen.getByText('TOEIC');
    const ielts = screen.getByRole('link', { name: 'IELTS' });
    const topics = screen.getByRole('link', { name: 'Topic lessons' });
    expect(topics).toHaveAttribute('href', '/admin/programs/intermediate/topics');
    expect(intermediate.nextElementSibling).toBe(topics);
    expect(topics.nextElementSibling).toBe(categories);
    expect(categories.compareDocumentPosition(toeic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(categories.compareDocumentPosition(ielts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'])('selects only the %s category on its editor route', (category) => {
    location.pathname = `/admin/programs/intermediate/${category}/record-id`;
    render(<AdminNavigation />);
    const nav = screen.getByRole('navigation', { name: 'Admin workspace' });
    const selected = within(nav).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute('href', `/admin/programs/intermediate/${category}`);
  });

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

  it('does not invent a category breadcrumb for invalid slugs', () => {
    location.pathname = '/admin/programs/intermediate/not-a-category/new';
    render(<AdminBreadcrumbs />);
    expect(screen.queryByRole('link', { name: 'Grammar' })).not.toBeInTheDocument();
  });
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
