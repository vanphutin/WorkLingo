import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import type { ContentImportDto } from '@worklingo/contracts';

import { ContentList } from './content-list';
import { LocaleProvider } from '../../i18n/provider';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';

vi.mock('../../lib/api/admin-content-lifecycle-client', () => ({ adminContentLifecycleClient: { remove: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
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

  function EditableList() {
    const [imports, setImports] = useState(sampleImports);
    return <ContentList imports={imports} onRemoved={({ id, action }) => setImports((items) => action === 'deleted'
      ? items.filter((item) => item.id !== id)
      : items.map((item) => item.id === id ? { ...item, status: 'ARCHIVED' } : item))} />;
  }

  it.each([false, true])('uses category add and edit destinations for empty=%s', (empty) => {
    render(<ContentList imports={empty ? [] : sampleImports}
      newImportHref="/admin/programs/intermediate/grammar/new" newImportLabel="Add grammar lesson"
      getItemHref={(item) => `/admin/programs/intermediate/grammar/${item.id}`} />);
    expect(screen.getByRole('link', { name: 'Add grammar lesson' })).toHaveAttribute('href', '/admin/programs/intermediate/grammar/new');
    if (!empty) expect(screen.getByRole('link', { name: /open draft/i })).toHaveAttribute('href', `/admin/programs/intermediate/grammar/${sampleImports[0]!.id}`);
    expect(screen.queryByRole('link', { name: 'New import' })).not.toBeInTheDocument();
  });

  it('deletes only the confirmed draft and keeps the other lesson editable', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: sampleImports[0]!.id, action: 'deleted' });
    render(<EditableList />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft: Lesson One' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Lesson One'));
    await waitFor(() => expect(screen.queryByText('Lesson One')).not.toBeInTheDocument());
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledWith('lesson', sampleImports[0]!.id, {
      expectedRevision: 1, expectedAction: 'deleted', idempotencyKey: expect.any(String),
    });
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', `/admin/content/${sampleImports[1]!.id}`);
  });

  it('archives a published lesson while keeping its record available to view', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: sampleImports[1]!.id, action: 'archived' });
    render(<EditableList />);
    fireEvent.click(screen.getByRole('button', { name: 'Archive lesson: Lesson Two' }));
    const row = screen.getByText('Lesson Two').closest('tr')!;
    await waitFor(() => expect(within(row).getByText('Archived')).toBeInTheDocument());
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledWith('lesson', sampleImports[1]!.id,
      expect.objectContaining({ expectedRevision: 3, expectedAction: 'archived' }));
    expect(within(row).getByRole('link', { name: 'View' })).toHaveAttribute('href', `/admin/content/${sampleImports[1]!.id}`);
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Lesson One')).toBeInTheDocument();
  });

  it('cancels removal without making a request and keeps failed mutations retryable', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValue(new Error('offline'));
    render(<EditableList />);
    const remove = screen.getByRole('button', { name: 'Delete draft: Lesson One' });
    fireEvent.click(remove);
    expect(adminContentLifecycleClient.remove).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(remove);
    await screen.findByRole('alert');
    expect(remove).toBeEnabled();
    fireEvent.click(remove);
    await waitFor(() => expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(2));
    expect(vi.mocked(adminContentLifecycleClient.remove).mock.calls[0]![2].idempotencyKey)
      .toBe(vi.mocked(adminContentLifecycleClient.remove).mock.calls[1]![2].idempotencyKey);
    expect(screen.getByText('Lesson One')).toBeInTheDocument();
  });

  it('reloads a draft published in another tab and requires a new archive confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValueOnce(new Error('Lifecycle changed'));
    function ConcurrentList() {
      const [imports, setImports] = useState(sampleImports);
      return <ContentList imports={imports} onReload={async () => {
        setImports((items) => items.map((item, index) => index === 0 ? {
          ...item, status: 'PUBLISHED', lessonId: sampleImports[1]!.lessonId, lessonVersionId: sampleImports[1]!.lessonVersionId,
        } : item));
      }} />;
    }
    render(<ConcurrentList />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete draft: Lesson One' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reload list' }));
    const archive = await screen.findByRole('button', { name: 'Archive lesson: Lesson One' });
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(1);
    fireEvent.click(archive);
    await waitFor(() => expect(adminContentLifecycleClient.remove).toHaveBeenCalledTimes(2));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[1]![0]).toContain('Archive');
    const calls = vi.mocked(adminContentLifecycleClient.remove).mock.calls;
    expect(calls[1]![2].expectedAction).toBe('archived');
    expect(calls[1]![2].idempotencyKey).not.toBe(calls[0]![2].idempotencyKey);
  });

  it('renders empty state when no imports exist', () => {
    render(<ContentList imports={[]} />);
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
