import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentList } from './content-list';
import { LocaleProvider } from '../../i18n/provider';

afterEach(() => {
  cleanup();
});

describe('ContentList', () => {
  const sampleImports: ContentImportDto[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      lessonId: null,
      lessonVersionId: null,
      rawSource: 'FORMAT: WorkLingoLesson/1.0\n\n[LESSON]\nslug: lesson-one\ntitle: Lesson One',
      sourceHash: 'hash-1',
      status: 'DRAFT',
      draftRevision: 1,
      parserVersion: '1.0.0',
      validationHash: null,
      createdById: '22222222-2222-4222-8222-222222222222',
      updatedById: '22222222-2222-4222-8222-222222222222',
      createdAt: '2026-10-04T10:00:00.000Z',
      updatedAt: '2026-10-04T10:30:00.000Z',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      lessonId: '33333333-3333-4333-8333-333333333333',
      lessonVersionId: '44444444-4444-4444-8444-444444444444',
      rawSource: 'FORMAT: WorkLingoLesson/1.0\n\n[LESSON]\nslug: lesson-two\ntitle: Lesson Two',
      sourceHash: 'hash-2',
      status: 'PUBLISHED',
      draftRevision: 3,
      parserVersion: '1.0.0',
      validationHash: 'hash-2',
      createdById: '22222222-2222-4222-8222-222222222222',
      updatedById: '22222222-2222-4222-8222-222222222222',
      createdAt: '2026-10-04T08:00:00.000Z',
      updatedAt: '2026-10-04T09:00:00.000Z',
    },
  ];

  it('renders empty state when no imports exist', () => {
    render(<ContentList imports={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/no content imports yet/i);
    expect(screen.getByText(/no content imports yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new import/i })).toHaveAttribute(
      'href',
      '/admin/content/new',
    );
  });

  it('localizes import statuses and dates while preserving lesson source titles and links', () => {
    render(<LocaleProvider initialLocale="vi"><ContentList imports={sampleImports} /></LocaleProvider>);
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getByText('Đã xuất bản')).toBeInTheDocument();
    expect(screen.getByText('Lesson One')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở bản nháp' })).toHaveAttribute('href', '/admin/content/11111111-1111-4111-8111-111111111111');
    expect(screen.getByText(new Date(sampleImports[0]!.updatedAt).toLocaleString('vi-VN'))).toHaveAttribute('dateTime', sampleImports[0]!.updatedAt);
  });

  it('renders list of imports with status, revision, and links to edit or view', () => {
    render(<ContentList imports={sampleImports} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('region', { name: 'Content imports', exact: true })).toHaveLength(1);
    expect(screen.getByRole('table').parentElement).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('table').parentElement).toHaveAccessibleName();

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText(/lesson-one/)).toBeInTheDocument();
    expect(screen.getByText(/lesson-two/)).toBeInTheDocument();
    expect(screen.getByText(/Rev 1/)).toBeInTheDocument();
    expect(screen.getByText(/Rev 3/)).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: /open|edit|view/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0]).toHaveAttribute(
      'href',
      '/admin/content/11111111-1111-4111-8111-111111111111',
    );
  });
});
