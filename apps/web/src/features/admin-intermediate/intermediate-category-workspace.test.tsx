import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentImportDto } from '@worklingo/contracts';
import { apiClient } from '../../lib/api/api-client';
import { adminContentLifecycleClient } from '../../lib/api/admin-content-lifecycle-client';
import { IntermediateCategoryWorkspace } from './intermediate-category-workspace';
import { IntermediateAuthoringHub } from './intermediate-authoring-hub';

vi.mock('../../lib/api/api-client', () => ({ apiClient: { listContentImports: vi.fn() } }));
vi.mock('../../lib/api/admin-content-lifecycle-client', () => ({ adminContentLifecycleClient: { remove: vi.fn() } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.resetAllMocks(); });

function lesson(id: string, metadata: string, title = id): ContentImportDto {
  return { id, rawSource: `FORMAT: WorkLingoLesson/1.0\n\n[LESSON]\nslug: ${id}\ntitle: ${title}\nlevel: B1\nduration_minutes: 60\n${metadata}\n\n[ACTIVATE]\nprompt: Hello`,
    lessonId: null, lessonVersionId: null, sourceHash: 'hash', status: 'DRAFT', draftRevision: 2,
    parserVersion: '1.0.0', validationHash: null, createdById: 'author', updatedById: 'author',
    createdAt: '2026-10-18T10:00:00.000Z', updatedAt: '2026-10-18T10:00:00.000Z' };
}
const grammar = lesson('grammar-record', 'program: intermediate\ncategory: grammar');
const reading = lesson('reading-record', 'program: intermediate\ncategory: reading');
const legacy = lesson('legacy-record', '', 'Intermediate grammar B1');
const other = lesson('other-record', 'program: ielts\ncategory: grammar');

describe('Intermediate category workspace', () => {
  it('filters explicit metadata only and links each row to its category editor', async () => {
    vi.mocked(apiClient.listContentImports).mockResolvedValue([grammar, reading, legacy, other]);
    render(<IntermediateCategoryWorkspace category="grammar" />);
    expect(await screen.findByText('grammar-record', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('reading-record', { selector: 'strong' })).not.toBeInTheDocument();
    expect(screen.queryByText('Intermediate grammar B1')).not.toBeInTheDocument();
    expect(screen.queryByText('other-record', { selector: 'strong' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open draft/i })).toHaveAttribute('href', '/admin/programs/intermediate/grammar/grammar-record');
    expect(screen.getByRole('link', { name: 'Add lesson: Grammar' })).toHaveAttribute('href', '/admin/programs/intermediate/grammar/new');
  });

  it('counts only explicitly classified records in the hub', async () => {
    vi.mocked(apiClient.listContentImports).mockResolvedValue([grammar, reading, legacy, other]);
    render(<IntermediateAuthoringHub />);
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Grammar' })).getByText('1 lesson')).toBeInTheDocument());
    expect(within(screen.getByRole('article', { name: 'Reading' })).getByText('1 lesson')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Writing' })).getByText('0 lessons')).toBeInTheDocument();
  });

  it('removes the confirmed category draft through the existing lifecycle callback', async () => {
    vi.mocked(apiClient.listContentImports).mockResolvedValue([grammar, reading]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(adminContentLifecycleClient.remove).mockResolvedValue({ id: grammar.id, action: 'deleted' });
    render(<IntermediateCategoryWorkspace category="grammar" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft: grammar-record' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete draft: grammar-record' })).not.toBeInTheDocument());
    expect(adminContentLifecycleClient.remove).toHaveBeenCalledWith('lesson', grammar.id, expect.objectContaining({ expectedRevision: 2, expectedAction: 'deleted' }));
    expect(screen.getByRole('link', { name: 'Add lesson: Grammar' })).toHaveAttribute('href', '/admin/programs/intermediate/grammar/new');
  });

  it('reloads a lifecycle conflict and re-filters category records before a new confirmation', async () => {
    vi.mocked(apiClient.listContentImports).mockResolvedValueOnce([grammar]).mockResolvedValueOnce([reading]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(adminContentLifecycleClient.remove).mockRejectedValue(new Error('conflict'));
    render(<IntermediateCategoryWorkspace category="grammar" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft: grammar-record' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reload list' }));
    await waitFor(() => expect(screen.queryByText('grammar-record', { selector: 'strong' })).not.toBeInTheDocument());
    expect(screen.queryByText('reading-record', { selector: 'strong' })).not.toBeInTheDocument();
  });

  it('offers a retry without showing a false empty list on failure', async () => {
    vi.mocked(apiClient.listContentImports).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([reading]);
    render(<IntermediateCategoryWorkspace category="reading" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load lessons');
    expect(screen.queryByText(/no content imports/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /open draft/i })).toHaveAttribute('href', '/admin/programs/intermediate/reading/reading-record');
  });

  it('ignores a request from the previous category after switching', async () => {
    let finish!: (items: ContentImportDto[]) => void;
    vi.mocked(apiClient.listContentImports).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce([reading]);
    const { rerender } = render(<IntermediateCategoryWorkspace category="grammar" />);
    rerender(<IntermediateCategoryWorkspace category="reading" />);
    await screen.findByRole('link', { name: /open draft/i });
    await act(async () => { finish([grammar]); });
    expect(screen.getByRole('link', { name: /open draft/i })).toHaveAttribute('href', '/admin/programs/intermediate/reading/reading-record');
  });
});
