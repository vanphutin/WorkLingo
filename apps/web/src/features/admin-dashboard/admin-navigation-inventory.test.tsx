import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminNavigation } from './admin-sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));
afterEach(cleanup);

it('maps every sidebar URL to a real page and preserves the 34+14 historical inventory plus the vocabulary workspace', () => {
  const app = path.resolve('src/app');
  function pages(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
      ? pages(path.join(directory, entry.name)) : entry.name === 'page.tsx' ? [path.join(directory, entry.name)] : []);
  }
  const actual = pages(app).map(file => '/' + path.relative(app, path.dirname(file)).split(path.sep).filter(part => part && !part.startsWith('(')).join('/')).sort();
  const inventory = JSON.parse(readFileSync(path.resolve('../../docs/admin-sidebar-ia/routes.json'), 'utf8')) as { route: string; cohort: string }[];
  expect([...inventory.map(row => row.route), '/admin/vocabulary'].sort()).toEqual(actual);
  expect(actual).toHaveLength(49);
  expect(inventory.filter(row => row.cohort === 'Liquid Glass 34')).toHaveLength(34);
  expect(inventory.filter(row => row.cohort === 'Additional 14')).toHaveLength(14);
  const templates = actual.map(route => new RegExp('^' + route.replaceAll('[slug]', '(intermediate|ielts)').replaceAll('[category]', '(grammar|pronunciation|vocabulary|reading|listening|speaking|writing)').replace(/\[[^\]]+\]/gu, '[^/]+') + '$'));
  render(<AdminNavigation />);
  const links = [...screen.getByRole('navigation', { name: 'Admin workspace' }).querySelectorAll('a')];
  for (const link of links) expect(templates.some(pattern => pattern.test(link.getAttribute('href')!)), link.getAttribute('href')!).toBe(true);
});
