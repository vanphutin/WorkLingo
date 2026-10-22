import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminNavigation } from './admin-navigation';
import { LocaleProvider } from '../../i18n/provider';

const location = vi.hoisted(() => ({ pathname: '/admin' }));
vi.mock('next/navigation', () => ({ usePathname: () => location.pathname }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); location.pathname = '/admin'; });
const nav = () => screen.getByRole('navigation', { name: 'Admin workspace' });
const group = (name: string) => within(nav()).getByRole('button', { name });

describe('Contextual admin sidebar', () => {
  it.each(['collapsed group', 'different program'])('restores visible focus at desktop breakpoint after %s', state => {
    let changed: (event: { matches: boolean }) => void = () => {};
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false,
      addEventListener: (_: string, listener: typeof changed) => { changed = listener; }, removeEventListener: vi.fn() })));
    location.pathname = state === 'collapsed group' ? '/admin/content' : '/admin/programs/intermediate/grammar';
    render(<AdminNavigation />);
    const mobileToggle = screen.getByRole('button', { name: 'Admin workspace' });
    fireEvent.click(mobileToggle);
    if (state === 'collapsed group') fireEvent.click(group('Shared management'));
    else fireEvent.click(within(nav()).getByRole('button', { name: 'IELTS' }));
    mobileToggle.focus(); act(() => changed({ matches: true }));
    expect(within(nav()).getByRole('link', { name: 'Overview' })).toHaveFocus();
    expect(document.activeElement?.closest('[hidden]')).toBeNull();
  });
  it('starts with four primary entries and no expanded tool list at overview', () => {
    render(<AdminNavigation />);
    expect(within(nav()).getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/admin']);
    for (const name of ['Training programs', 'Shared management', 'System']) expect(group(name)).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens one group at a time and exposes existing IELTS tools only after selecting IELTS', () => {
    render(<AdminNavigation />);
    fireEvent.click(group('Training programs'));
    fireEvent.click(within(nav()).getByRole('button', { name: 'IELTS' }));
    expect(within(nav()).getByRole('link', { name: 'IELTS orientation' })).toBeVisible();
    expect(within(nav()).queryByRole('link', { name: 'Grammar' })).not.toBeInTheDocument();
    fireEvent.click(group('System'));
    expect(group('Training programs')).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav()).getByRole('link', { name: 'AI settings' })).toBeVisible();
    expect(within(nav()).queryByRole('link', { name: 'IELTS orientation' })).not.toBeInTheDocument();
  });

  it('shows missing programs as proposed IA without dead links', () => {
    render(<AdminNavigation />); fireEvent.click(group('Training programs'));
    for (const name of ['Foundation', 'Basic', 'TOEIC']) {
      expect(within(nav()).queryByRole('link', { name })).not.toBeInTheDocument();
      expect(within(nav()).getByText(name, { exact: true }).parentElement).toHaveTextContent('Proposed IA');
    }
    expect(nav().querySelector('a[href="/admin/programs/beginner"]')).toBeNull();
    expect(nav().querySelector('a[href="/admin/programs/toeic"]')).toBeNull();
  });

  it.each([
    ['/admin/programs/intermediate/topics/new', '/admin/programs/intermediate/topics', 'Training programs'],
    ['/admin/programs/intermediate/topic-groups', '/admin/programs/intermediate/topic-groups', 'Training programs'],
    ['/admin/programs/intermediate/grammar/record', '/admin/programs/intermediate/grammar', 'Training programs'],
    ['/admin/ielts-topics', '/admin/ielts-topics', 'Training programs'],
    ['/admin/ielts-band-curriculum', '/admin/ielts-band-curriculum', 'Training programs'],
    ['/admin/content/new', '/admin/content/new', 'Shared management'],
    ['/admin/content/record', '/admin/content', 'Shared management'],
    ['/admin/settings/ai', '/admin/settings/ai', 'System'],
  ])('opens the owning group with exactly one active link for %s', (pathname, href, name) => {
    location.pathname = pathname; render(<AdminNavigation />);
    expect(group(name)).toHaveAttribute('aria-expanded', 'true');
    const active = nav().querySelectorAll('[aria-current="page"]');
    expect(active).toHaveLength(1); expect(active[0]).toHaveAttribute('href', href);
    expect(active[0]).toBeVisible();
  });

  it('does not select a destination for a prefix collision', () => {
    location.pathname = '/admin/ielts-topics-invalid'; render(<AdminNavigation />);
    expect(nav().querySelector('[aria-current="page"]')).toBeNull();
  });

  it('follows route changes, including returning to a previously collapsed active group', () => {
    location.pathname = '/admin/programs/intermediate/grammar';
    const view = render(<AdminNavigation />);
    fireEvent.click(group('Training programs'));
    location.pathname = '/admin/settings/ai'; view.rerender(<AdminNavigation />);
    expect(group('System')).toHaveAttribute('aria-expanded', 'true');
    location.pathname = '/admin/programs/intermediate/grammar'; view.rerender(<AdminNavigation />);
    expect(group('Training programs')).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav()).getByRole('link', { name: 'Grammar' })).toHaveAttribute('aria-current', 'page');
  });

  it('Escape closes the current group and restores trigger focus without touching draft state', () => {
    location.pathname = '/admin/programs/intermediate/grammar/new';
    render(<><AdminNavigation /><label>Draft<input defaultValue="Unsaved text" /></label></>);
    within(nav()).getByRole('link', { name: 'Reading' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(group('Training programs')).toHaveAttribute('aria-expanded', 'false');
    expect(group('Training programs')).toHaveFocus();
    fireEvent.click(group('Shared management')); fireEvent.click(group('System'));
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved text');
  });

  it('retains every old destination exactly once, plus the existing import shortcut', () => {
    render(<AdminNavigation />);
    const hrefs = [...nav().querySelectorAll('a')].map(a => a.getAttribute('href'));
    const old = ['/admin', '/admin/programs/intermediate', '/admin/programs/ielts',
      '/admin/programs/intermediate/topic-groups', '/admin/programs/intermediate/topics',
      ...['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'].map(c => `/admin/programs/intermediate/${c}`),
      '/admin/ielts-topics', '/admin/ielts-orientation', '/admin/ielts-bridge', '/admin/ielts-integrated', '/admin/ielts-mocks', '/admin/ielts-band-curriculum',
      '/admin/content', '/admin/curriculum', '/admin/analytics', '/admin/audit', '/admin/operations', '/admin/settings/audio', '/admin/settings/ai', '/dashboard'];
    expect(hrefs).toHaveLength(27); expect(new Set(hrefs).size).toBe(27);
    for (const href of old) expect(hrefs).toContain(href);
    fireEvent.click(group('Shared management'));
    expect(within(nav()).getByRole('link', { name: 'Import content' })).toHaveAttribute('href', '/admin/content/new');
  });

  it('uses Vietnamese primary and program labels', () => {
    render(<LocaleProvider initialLocale="vi"><AdminNavigation /></LocaleProvider>);
    const navigation = screen.getByRole('navigation', { name: 'Không gian quản trị' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Chương trình đào tạo' }));
    expect(within(navigation).getByText('Mất gốc', { exact: true })).toBeVisible();
    expect(within(navigation).getByText('Cơ bản', { exact: true })).toBeVisible();
    expect(within(navigation).getByRole('button', { name: 'Trung cấp' })).toBeVisible();
    expect(within(navigation).getByRole('button', { name: 'Hệ thống' })).toBeVisible();
  });
});
