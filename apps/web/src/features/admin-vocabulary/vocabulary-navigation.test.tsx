import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminNavigation, AdminBreadcrumbs } from '../admin-dashboard/admin-navigation';
import { LocaleProvider } from '../../i18n/provider';
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/vocabulary' }));
afterEach(cleanup);
it.each([['en', 'Shared management', 'Vocabulary library'], ['vi', 'Quản lý chung', 'Thư viện từ vựng']] as const)('adds vocabulary under shared management in %s while preserving old tools', (locale, group, label) => {
  render(<LocaleProvider initialLocale={locale}><AdminNavigation /><AdminBreadcrumbs /></LocaleProvider>);
  const nav = screen.getByRole('navigation', { name: locale === 'en' ? 'Admin workspace' : 'Không gian quản trị' });
  const toggle = within(nav).getByRole('button', { name: group }); if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
  expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', '/admin/vocabulary');
  expect(nav.querySelector('a[href="/admin/content"]')).toBeInTheDocument();
  expect(nav.querySelector('a[href="/admin/curriculum"]')).toBeInTheDocument();
  expect(document.querySelector('.ad-breadcrumbs [aria-current="page"]')).toHaveTextContent(label);
});
